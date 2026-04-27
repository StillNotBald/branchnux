// trunknux summarize
// Generates SPRINT_SUMMARY.md from git log for the most-recent (or named) sprint folder.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** Validate a date string is strictly YYYY-MM-DD */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function assertDateFormat(value, label) {
  if (!DATE_RE.test(value)) {
    console.error(
      `ERROR: ${label} "${value}" is not a valid YYYY-MM-DD date. ` +
        'Refusing to run git log.'
    );
    process.exit(2);
  }
}

const DATE_SLUG_RE = /^(\d{4}-\d{2}-\d{2})_(.+)$/;

function todayISO() {
  // Use local date (not UTC) to match git's local-time commit dates.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return YYYY-MM-DD for the day after the given ISO date string. */
function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return all sprint folders sorted newest-first */
function findSprintFolders(cwd) {
  const sprintLogDir = path.join(cwd, 'sprint-log');
  if (!fs.existsSync(sprintLogDir)) return [];
  return fs
    .readdirSync(sprintLogDir)
    .filter((name) => {
      const full = path.join(sprintLogDir, name);
      return fs.statSync(full).isDirectory() && DATE_SLUG_RE.test(name);
    })
    .sort()
    .reverse();
}

/**
 * Resolve which sprint folder to use.
 * Returns { folderName, date, slug } or null.
 */
function resolveSprintFolder(cwd, sprintSlug) {
  const folders = findSprintFolders(cwd);
  if (folders.length === 0) return null;

  if (sprintSlug) {
    const match = folders.find((f) => {
      const m = DATE_SLUG_RE.exec(f);
      return m && m[2] === sprintSlug;
    });
    if (!match) return null;
    const m = DATE_SLUG_RE.exec(match);
    return { folderName: match, date: m[1], slug: m[2] };
  }

  // Most recent
  const m = DATE_SLUG_RE.exec(folders[0]);
  return { folderName: folders[0], date: m[1], slug: m[2] };
}

const CONVENTIONAL_PREFIX_RE =
  /^(feat|fix|docs|chore|test|refactor)(?:\([^)]*\))?!?:/i;

const SECTION_LABELS = {
  feat: 'Features',
  fix: 'Fixes',
  docs: 'Docs',
  chore: 'Chores',
  test: 'Tests',
  refactor: 'Refactors',
  other: 'Other',
};

function classifyCommit(subject) {
  const m = CONVENTIONAL_PREFIX_RE.exec(subject);
  if (!m) return 'other';
  return m[1].toLowerCase();
}

function renderSection(title, commits) {
  if (commits.length === 0) return '';
  const lines = commits.map(
    ({ hash, subject, author, date }) =>
      `- ${hash} ${subject} (${author}, ${date})`
  );
  return `## ${title}\n${lines.join('\n')}\n`;
}

/**
 * @param {{ sprint?: string, since?: string, until?: string, force?: boolean, cwd?: string }} opts
 */
export function summarize(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const sprintLogDir = path.join(cwd, 'sprint-log');

  if (!fs.existsSync(sprintLogDir)) {
    console.error(
      'No sprint-log directory found.\n' +
        'Run `trunknux new-sprint <slug>` first.'
    );
    process.exit(2);
  }

  const resolved = resolveSprintFolder(cwd, opts.sprint ?? null);
  if (!resolved) {
    if (opts.sprint) {
      console.error(
        `No sprint folder found matching slug "${opts.sprint}".\n` +
          'Run `trunknux new-sprint <slug>` first.'
      );
    } else {
      console.error(
        'No sprint folders found.\n' +
          'Run `trunknux new-sprint <slug>` first.'
      );
    }
    process.exit(2);
  }

  const { folderName, date: sprintDate, slug } = resolved;
  const sprintDir = path.join(sprintLogDir, folderName);
  const summaryPath = path.join(sprintDir, 'SPRINT_SUMMARY.md');

  if (fs.existsSync(summaryPath) && !opts.force) {
    console.warn(`Warning: SPRINT_SUMMARY.md already exists at ${summaryPath}`);
    console.warn('Pass --force to overwrite.');
    process.exit(0);
  }

  const since = opts.since ?? sprintDate;
  const until = opts.until ?? todayISO();

  // Validate both dates BEFORE touching git — prevents command injection.
  assertDateFormat(since, '--since');
  assertDateFormat(until, '--until');

  // git treats --until=YYYY-MM-DD as midnight (start of that day), which
  // excludes commits made on that date. Use the next day so "until today"
  // is inclusive of all commits made today.
  const untilNextDay = addOneDay(until);

  // Use spawnSync with an array — no shell interpolation, no injection risk.
  // Field delimiter is ASCII Unit Separator (\x1f) so subjects containing "|"
  // are parsed correctly (Fix 5).
  let rawLog;
  const result = spawnSync(
    'git',
    [
      'log',
      `--pretty=format:%h\x1f%s\x1f%an\x1f%ad`,
      '--date=short',
      `--since=${since}`,
      `--until=${untilNextDay}`,
    ],
    { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  if (result.error) {
    console.error(`Error: could not spawn git — ${result.error.message}`);
    process.exit(2);
  }
  if (result.status !== 0) {
    const stderr = result.stderr ?? '';
    if (stderr.includes('not a git repository')) {
      console.error(
        'Error: not a git repository.\n' +
          'Run `trunknux summarize` from inside a git repo.'
      );
      process.exit(2);
    }
    // git may return non-zero on empty range; treat output as empty
  }
  rawLog = (result.stdout ?? '').trim();

  const commits = rawLog
    ? rawLog.split('\n').map((line) => {
        // Split on \x1f (ASCII Unit Separator) — safe even when subject contains "|"
        const [hash, subject, author, date] = line.split('\x1f');
        return { hash: hash ?? '', subject: subject ?? '', author: author ?? '', date: date ?? '' };
      })
    : [];

  // Group
  const groups = {
    feat: [],
    fix: [],
    docs: [],
    chore: [],
    test: [],
    refactor: [],
    other: [],
  };
  for (const commit of commits) {
    const key = classifyCommit(commit.subject);
    groups[key].push(commit);
  }

  const N = commits.length;

  const sections = Object.entries(SECTION_LABELS)
    .map(([key, label]) => renderSection(label, groups[key]))
    .filter(Boolean)
    .join('\n');

  const content = `---
sprint: ${slug}
date_range: ${since} .. ${until}
commit_count: ${N}
---
# Sprint Summary: ${slug}

**Range:** ${since} → ${until}
**Commits:** ${N}

${sections || '_No commits found in this range._'}
`.trimEnd() + '\n';

  fs.writeFileSync(summaryPath, content, 'utf8');
  console.log(`Generated: ${summaryPath}`);
  console.log(`Commits:   ${N}`);
  process.exit(0);
}
