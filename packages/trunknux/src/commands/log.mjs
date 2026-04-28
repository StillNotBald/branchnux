// trunknux log
// Appends a date-stamped narrative journal entry to the current sprint folder's LOG.md.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DATE_SLUG_RE, PATHS } from '@leapnux/6nux-core/conventions';
import { todayISO } from '@leapnux/6nux-core/ids';

/** Title-case a kebab slug: "my-sprint" → "My Sprint" */
function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Return all sprint folders (folder names only) sorted newest-first. */
function findSprintFolders(cwd) {
  const sprintLogDir = path.join(cwd, PATHS.sprintLog);
  if (!fs.existsSync(sprintLogDir)) return null; // signals missing dir
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
 * Resolve the sprint folder to use.
 * Returns { folderName, date, slug } or null (no match).
 * @param {string} cwd
 * @param {string|null} sprintSlug  override slug, or null for latest
 */
function resolveSprintFolder(cwd, sprintSlug) {
  const folders = findSprintFolders(cwd);
  if (folders === null) return { error: 'no-sprintlog-dir' };
  if (folders.length === 0) return { error: 'no-sprint-folders' };

  if (sprintSlug) {
    const match = folders.find((f) => {
      const m = DATE_SLUG_RE.exec(f);
      return m && m[2] === sprintSlug;
    });
    if (!match) return { error: 'no-matching-slug', slug: sprintSlug };
    const m = DATE_SLUG_RE.exec(match);
    return { folderName: match, date: m[1], slug: m[2] };
  }

  // Most recent
  const m = DATE_SLUG_RE.exec(folders[0]);
  return { folderName: folders[0], date: m[1], slug: m[2] };
}

/** Build LOG.md scaffold content for a brand-new file. */
function buildScaffold(slug, date, entry) {
  return `---
sprint: ${slug}
schema: log-v1
---
# Sprint Log: ${titleCase(slug)}

This file collects dated narrative entries for the sprint. Append new entries via \`trunknux log\`. Don't manually edit older entries (they are part of the audit trail); to retract, add a new entry referencing the prior one.

## ${date}

${entry}
`;
}

/**
 * Append entry to an existing LOG.md.
 * If today already has a ## heading, append under it (blank line separation).
 * If not, add a new ## heading.
 */
function buildAppend(existing, date, entry) {
  const headingRe = new RegExp(`^## ${date}$`, 'm');
  if (headingRe.test(existing)) {
    // Today's section exists — append to it
    // Find where the NEXT ## heading is (or end of file)
    const lines = existing.split('\n');
    const headingIdx = lines.findIndex((l) => l === `## ${date}`);
    // Find the next ## after headingIdx
    let nextHeading = lines.length;
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^## /.test(lines[i])) {
        nextHeading = i;
        break;
      }
    }
    // Insert a blank line + entry before nextHeading
    lines.splice(nextHeading, 0, '', entry);
    // Ensure single trailing newline
    return lines.join('\n').trimEnd() + '\n';
  }

  // New date heading — append at end
  const trimmed = existing.trimEnd();
  return `${trimmed}\n\n## ${date}\n\n${entry}\n`;
}

/**
 * Read multiline input from stdin until EOF (Ctrl-D).
 * Resolves with the trimmed string.
 */
function readStdin() {
  return new Promise((resolve) => {
    process.stdout.write('Log entry (Ctrl-D to finish, Ctrl-C to cancel):\n');
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('').trimEnd()));
    process.stdin.resume();
  });
}

/**
 * Core implementation — separated so tests can call it without subprocess overhead.
 *
 * @param {{
 *   message?: string,
 *   sprint?: string,
 *   json?: boolean,
 *   cwd?: string,
 *   input?: string,   // pre-supplied entry text (bypasses stdin; used by tests)
 * }} opts
 */
export async function log(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();

  // ── Resolve sprint folder ──────────────────────────────────────────────────
  const resolved = resolveSprintFolder(cwd, opts.sprint ?? null);

  if (resolved.error === 'no-sprintlog-dir') {
    console.error('No sprint-log directory. Run `trunknux new-sprint <slug>` first.');
    process.exit(2);
  }
  if (resolved.error === 'no-sprint-folders') {
    console.error('No sprint folders found. Run `trunknux new-sprint <slug>` first.');
    process.exit(2);
  }
  if (resolved.error === 'no-matching-slug') {
    console.error(
      `No sprint folder found matching slug "${resolved.slug}".\n` +
        'Run `trunknux new-sprint <slug>` first or check available slugs in sprint-log/.'
    );
    process.exit(2);
  }

  const { folderName, slug } = resolved;
  const sprintDir = path.join(cwd, PATHS.sprintLog, folderName);
  const logPath = path.join(sprintDir, 'LOG.md');

  // ── Get entry text ─────────────────────────────────────────────────────────
  let entry;
  if (opts.input !== undefined) {
    // Programmatic / test override
    entry = opts.input.trimEnd();
  } else if (opts.message !== undefined) {
    entry = String(opts.message).trimEnd();
  } else {
    entry = await readStdin();
  }

  if (!entry) {
    console.error('Empty log entry — nothing written.');
    process.exit(1);
  }

  // ── Build file content ─────────────────────────────────────────────────────
  const date = todayISO();
  let newContent;

  if (fs.existsSync(logPath)) {
    const existing = fs.readFileSync(logPath, 'utf8');
    newContent = buildAppend(existing, date, entry);
  } else {
    newContent = buildScaffold(slug, date, entry);
  }

  // ── Write to disk ──────────────────────────────────────────────────────────
  try {
    fs.writeFileSync(logPath, newContent, 'utf8');
  } catch (err) {
    console.error(`Error: could not write log at ${logPath}: ${err.message}`);
    process.exit(1);
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  if (opts.json) {
    const out = JSON.stringify({ sprint: folderName, date, entry });
    process.stdout.write(out + '\n');
  } else {
    console.log(`Appended to: ${logPath}`);
  }

  process.exit(0);
}
