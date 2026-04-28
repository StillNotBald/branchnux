// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/health.mjs
 *
 * Implements `leafnux health [--json] [--quiet] [--check <category>]`.
 *
 * Reads existing 5-NUX artifacts in cwd and produces a structured health
 * snapshot. File-native, single-user, no network calls.
 *
 * Categories:
 *   requirements — R-XX completion % from requirements/REQUIREMENTS.md
 *   risks        — OPEN count from requirements/risks/risks.md
 *   adrs         — ADR status breakdown from docs/adr/NNNN-*.md
 *   sprint       — days since most recent sprint-log/<YYYY-MM-DD>_<slug>/
 *   tests        — workspaces with a test script in package.json
 *
 * Exit codes (only meaningful with --quiet):
 *   0  GREEN
 *   1  AMBER
 *   2  RED
 */

import fs from 'node:fs';
import path from 'node:path';
import { PATHS, STATUSES, DATE_SLUG_RE } from '@leapnux/6nux-core/conventions';
import { RXX_PATTERN, todayISO } from '@leapnux/6nux-core/ids';
import { parseMarkdownFrontmatter } from '@leapnux/6nux-core/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOJI = { green: '🟢', amber: '🟡', red: '🔴', missing: '—' };
const BAR = '═'.repeat(69);

// Known R-XX statuses (uppercase)
const RXX_STATUSES = STATUSES.map(s => s.toUpperCase());

// R-XX cell pattern: must be exactly "R-\d{1,4}" (no word context needed here)
const RXX_CELL_RE = /^R-\d{1,4}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD → Date (local midnight) */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days between two dates (floor) */
function daysBetween(a, b) {
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

/** Today as YYYY-MM-DD */
function todayDate() {
  return todayISO();
}

// ── Category: requirements ────────────────────────────────────────────────────

/**
 * @param {string} cwd
 * @returns {{ status: 'green'|'amber'|'red'|'missing', label: string, data: object }}
 */
function checkRequirements(cwd) {
  const reqPath = path.join(cwd, PATHS.requirements);

  if (!fs.existsSync(reqPath)) {
    return {
      status: 'amber',
      label: '— (requirements/REQUIREMENTS.md not found)',
      data: { missing: true },
    };
  }

  const raw = fs.readFileSync(reqPath, 'utf-8');
  const lines = raw.split('\n');

  // Count per-status
  const counts = {};
  for (const s of RXX_STATUSES) counts[s] = 0;
  const unknown = {};

  for (const line of lines) {
    if (!line.includes('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    const rxxCell = cells.find(c => RXX_CELL_RE.test(c));
    if (!rxxCell) continue;

    const statusCell = cells.find(c => RXX_STATUSES.includes(c.toUpperCase()));
    if (!statusCell) continue;

    const key = statusCell.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key]++;
    } else {
      unknown[key] = (unknown[key] ?? 0) + 1;
    }
  }

  const done = counts['DONE'] ?? 0;
  const total = RXX_STATUSES.reduce((s, k) => s + (counts[k] ?? 0), 0)
    + Object.values(unknown).reduce((s, v) => s + v, 0);

  if (total === 0) {
    return {
      status: 'red',
      label: '— (no R-XX entries found)',
      data: { total: 0, done: 0, pct: 0, counts, unknown },
    };
  }

  const pct = Math.round((done / total) * 100);
  let status;
  if (pct >= 80) status = 'green';
  else if (pct >= 50) status = 'amber';
  else status = 'red';

  // Build summary of non-zero statuses (excluding DONE)
  const extras = RXX_STATUSES
    .filter(s => s !== 'DONE' && counts[s] > 0)
    .map(s => `${counts[s]} ${s}`)
    .join(', ');

  const label = `${done}/${total} DONE (${pct}%)${extras ? ' — ' + extras : ''}`;

  return {
    status,
    label,
    data: { total, done, pct, counts: { ...counts, ...unknown } },
  };
}

// ── Category: risks ───────────────────────────────────────────────────────────

function checkRisks(cwd) {
  const risksPath = path.join(cwd, PATHS.risks);

  if (!fs.existsSync(risksPath)) {
    return {
      status: 'amber',
      label: '— (requirements/risks/risks.md not found)',
      data: { missing: true },
    };
  }

  const raw = fs.readFileSync(risksPath, 'utf-8');
  const lines = raw.split('\n');

  // Count rows by uppercase STATUS word in any cell
  const statusCounts = {};

  for (const line of lines) {
    if (!line.includes('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    // Accept any single-word ALL-CAPS cell as a status
    const statusCell = cells.find(c => /^[A-Z][A-Z_-]+$/.test(c) && c.length >= 2);
    if (!statusCell) continue;

    const key = statusCell.toUpperCase();
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  const openCount = statusCounts['OPEN'] ?? 0;

  let status;
  if (openCount === 0) status = 'green';
  else if (openCount <= 3) status = 'amber';
  else status = 'red';

  // Build severity breakdown if we have severity hints (HIGH/MED/LOW columns)
  // We'll just report total OPEN + total MITIGATED etc.
  const parts = Object.entries(statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');

  const label = parts || '0 rows';

  return {
    status,
    label,
    data: { statusCounts, openCount },
  };
}

// ── Category: ADRs ────────────────────────────────────────────────────────────

function checkAdrs(cwd) {
  const adrDir = path.join(cwd, PATHS.adrs);

  if (!fs.existsSync(adrDir)) {
    return {
      status: 'amber',
      label: '— (docs/adr/ not found)',
      data: { missing: true },
    };
  }

  const files = fs.readdirSync(adrDir).filter(f => /^\d{4}-.*\.md$/.test(f));

  if (files.length === 0) {
    return {
      status: 'amber',
      label: '— (no ADR files found)',
      data: { total: 0, statusCounts: {} },
    };
  }

  const statusCounts = {};

  for (const file of files) {
    const content = fs.readFileSync(path.join(adrDir, file), 'utf-8');
    let adrStatus = 'unknown';
    try {
      const parsed = parseMarkdownFrontmatter(content);
      adrStatus = (parsed.data?.status ?? 'unknown').toLowerCase().trim();
    } catch {
      adrStatus = 'unknown';
    }
    statusCounts[adrStatus] = (statusCounts[adrStatus] ?? 0) + 1;
  }

  const total = files.length;
  const accepted = statusCounts['accepted'] ?? 0;
  const proposed = statusCounts['proposed'] ?? 0;
  const deprecated = statusCounts['deprecated'] ?? 0;
  const superseded = statusCounts['superseded'] ?? 0;

  // RED: any deprecated WITHOUT corresponding supersession (use superseded count as proxy)
  // GREEN: all accepted (or superseded — those are resolved)
  // AMBER: any proposed
  let status;
  if (deprecated > 0 && superseded === 0) {
    status = 'red';
  } else if (proposed > 0) {
    status = 'amber';
  } else {
    status = 'green';
  }

  const parts = Object.entries(statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');

  return {
    status,
    label: `${total} total — ${parts}`,
    data: { total, statusCounts },
  };
}

// ── Category: sprint freshness ────────────────────────────────────────────────

function checkSprint(cwd) {
  const sprintLogDir = path.join(cwd, PATHS.sprintLog);

  if (!fs.existsSync(sprintLogDir)) {
    return {
      status: 'amber',
      label: '— (sprint-log/ not found)',
      data: { missing: true },
    };
  }

  const folders = fs.readdirSync(sprintLogDir)
    .filter(name => {
      const full = path.join(sprintLogDir, name);
      return fs.statSync(full).isDirectory() && DATE_SLUG_RE.test(name);
    });

  if (folders.length === 0) {
    return {
      status: 'amber',
      label: '— (no date-prefixed sprint folders found)',
      data: { missing: true },
    };
  }

  // Find most recent by date prefix
  folders.sort((a, b) => {
    const ma = DATE_SLUG_RE.exec(a);
    const mb = DATE_SLUG_RE.exec(b);
    return mb[1].localeCompare(ma[1]);
  });

  const latest = folders[0];
  const match = DATE_SLUG_RE.exec(latest);
  const sprintDate = match[1];
  const sprintSlug = match[2];

  const today = parseDate(todayDate());
  const sprintDay = parseDate(sprintDate);
  const days = daysBetween(sprintDay, today);

  let status;
  if (days <= 7) status = 'green';
  else if (days <= 21) status = 'amber';
  else status = 'red';

  return {
    status,
    label: `${days} days since ${sprintDate}_${sprintSlug}`,
    data: { days, sprintDate, sprintSlug, folderName: latest },
  };
}

// ── Category: test infra ──────────────────────────────────────────────────────

function checkTests(cwd) {
  // Find all package.json files in cwd (workspace root + packages/*)
  const pkgPaths = [];

  // Root package.json
  const rootPkg = path.join(cwd, 'package.json');
  if (fs.existsSync(rootPkg)) pkgPaths.push(rootPkg);

  // packages/* if present
  const packagesDir = path.join(cwd, 'packages');
  if (fs.existsSync(packagesDir)) {
    const pkgDirs = fs.readdirSync(packagesDir).filter(name => {
      const full = path.join(packagesDir, name);
      return fs.statSync(full).isDirectory();
    });
    for (const d of pkgDirs) {
      const pkgJson = path.join(packagesDir, d, 'package.json');
      if (fs.existsSync(pkgJson)) pkgPaths.push(pkgJson);
    }
  }

  if (pkgPaths.length === 0) {
    return {
      status: 'amber',
      label: '— (no package.json found)',
      data: { missing: true },
    };
  }

  let withTest = 0;
  let withoutTest = 0;
  const workspaces = [];

  for (const p of pkgPaths) {
    try {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const name = pkg.name ?? path.relative(cwd, path.dirname(p));
      const hasTest = Boolean(pkg.scripts?.test);
      workspaces.push({ name, hasTest });
      if (hasTest) withTest++;
      else withoutTest++;
    } catch {
      // skip malformed package.json
    }
  }

  const total = withTest + withoutTest;
  let status;
  if (withoutTest === 0) status = 'green';
  else if (withTest > 0) status = 'amber';
  else status = 'red';

  return {
    status,
    label: `${withTest}/${total} workspaces with test scripts`,
    data: { total, withTest, withoutTest, workspaces },
  };
}

// ── Overall rollup ────────────────────────────────────────────────────────────

function rollupStatus(statuses) {
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('amber')) return 'amber';
  return 'green';
}

function statusEmoji(status) {
  return EMOJI[status] ?? '—';
}

function statusLabel(status) {
  return status.toUpperCase();
}

// ── Public API ────────────────────────────────────────────────────────────────

const CATEGORIES = ['requirements', 'risks', 'adrs', 'sprint', 'tests'];

/**
 * @param {{
 *   cwd?: string,
 *   json?: boolean,
 *   quiet?: boolean,
 *   check?: string|null
 * }} opts
 * @returns {Promise<number>} exit code
 */
export async function runHealth(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const jsonMode = opts.json ?? false;
  const quietMode = opts.quiet ?? false;
  const checkOnly = opts.check ? opts.check.toLowerCase().trim() : null;

  // Validate --check category
  if (checkOnly && !CATEGORIES.includes(checkOnly)) {
    console.error(
      `ERROR: unknown category "${checkOnly}". Valid: ${CATEGORIES.join(', ')}`
    );
    return 1;
  }

  const projectName = path.basename(cwd);

  // ── Run checks ─────────────────────────────────────────────────────────────

  const runners = {
    requirements: () => checkRequirements(cwd),
    risks:        () => checkRisks(cwd),
    adrs:         () => checkAdrs(cwd),
    sprint:       () => checkSprint(cwd),
    tests:        () => checkTests(cwd),
  };

  const results = {};
  const categoriesToRun = checkOnly ? [checkOnly] : CATEGORIES;

  for (const cat of categoriesToRun) {
    results[cat] = runners[cat]();
  }

  const allStatuses = Object.values(results).map(r => r.status);
  const overall = rollupStatus(allStatuses);

  const greenCount = allStatuses.filter(s => s === 'green').length;
  const amberCount = allStatuses.filter(s => s === 'amber').length;
  const redCount   = allStatuses.filter(s => s === 'red').length;
  const total      = allStatuses.length;

  // ── JSON mode ──────────────────────────────────────────────────────────────

  if (jsonMode) {
    const output = {
      overall,
      categories: {},
    };
    for (const cat of categoriesToRun) {
      const r = results[cat];
      output.categories[cat] = {
        status: r.status,
        label: r.label,
        ...r.data,
      };
    }
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    return 0;
  }

  // ── Quiet mode ─────────────────────────────────────────────────────────────

  if (quietMode) {
    console.log(`Overall: ${statusLabel(overall)}`);
    if (overall === 'green') return 0;
    if (overall === 'amber') return 1;
    return 2;
  }

  // ── Full report ────────────────────────────────────────────────────────────

  const LABEL_WIDTH = 18;
  const pad = (s, n) => String(s).padEnd(n);

  console.log(`leafnux health — ${projectName}`);
  console.log(BAR);

  for (const cat of categoriesToRun) {
    const r = results[cat];
    const emoji = r.status === 'missing' ? EMOJI.missing : statusEmoji(r.status);
    const catLabel = {
      requirements: 'Requirements',
      risks:        'Risks',
      adrs:         'ADRs',
      sprint:       'Sprint freshness',
      tests:        'Test infra',
    }[cat] ?? cat;

    console.log(`${pad(catLabel, LABEL_WIDTH)}${emoji} ${r.label}`);
  }

  console.log(BAR);

  // Summary counts
  const summaryParts = [];
  if (greenCount > 0) summaryParts.push(`${greenCount}/${total} green`);
  if (amberCount > 0) summaryParts.push(`${amberCount}/${total} amber`);
  if (redCount > 0)   summaryParts.push(`${redCount}/${total} red`);

  console.log(`Overall: ${statusLabel(overall)} (${summaryParts.join(', ')})`);

  // Without --quiet, always exit 0 (it's a report)
  return 0;
}
