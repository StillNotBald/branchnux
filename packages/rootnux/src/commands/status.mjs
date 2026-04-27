// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/status.mjs
 *
 * Implements `rootnux status [--json]`.
 *
 * Reads requirements/REQUIREMENTS.md, parses R-XX rows, counts by status,
 * prints a table (or JSON with --json).
 *
 * Exit 0 always.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['DONE', 'BLOCKED', 'PARTIAL', 'NOT STARTED', 'DECLINED', 'DEFERRED', 'FAKE'];

// Known status keywords for column-position-independent parsing (case-insensitive).
const STATUS_KEYWORDS = ALL_STATUSES.map(s => s.toUpperCase());

// Matches an R-XX cell (1-4 digits, case-sensitive prefix).
const RXX_CELL_RE = /^R-\d{1,4}$/;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ cwd?: string, json?: boolean }} opts
 * @returns {Promise<number>} exit code
 */
export async function runStatus(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const jsonMode = opts.json ?? false;
  const reqPath = path.join(cwd, 'requirements', 'REQUIREMENTS.md');

  if (!fs.existsSync(reqPath)) {
    const msg = 'rootnux init not run yet (REQUIREMENTS.md missing)';
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ error: msg }) + '\n');
    } else {
      console.error(msg);
    }
    return 2;
  }

  // ── Parse REQUIREMENTS.md ─────────────────────────────────────────────────

  const raw = fs.readFileSync(reqPath, 'utf-8');
  const lines = raw.split('\n');

  const counts = {};
  for (const s of ALL_STATUSES) counts[s] = 0;
  const unknown = {};

  for (const line of lines) {
    // Only process pipe-delimited table rows
    if (!line.includes('|')) continue;
    // Split by '|' and trim each cell; filter out empty boundary cells
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    // Find the first cell matching R-\d{1,4}
    const rxxCell = cells.find(c => RXX_CELL_RE.test(c));
    if (!rxxCell) continue;

    // Find the first cell that matches a known status keyword (case-insensitive)
    const statusCell = cells.find(c => STATUS_KEYWORDS.includes(c.toUpperCase()));
    if (!statusCell) continue;

    const status = statusCell.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status]++;
    } else {
      unknown[status] = (unknown[status] ?? 0) + 1;
    }
  }

  // Include unknowns in output
  const allKeys = [...ALL_STATUSES, ...Object.keys(unknown)];
  const total = allKeys.reduce((sum, k) => sum + (counts[k] ?? unknown[k] ?? 0), 0);

  // ── Output ────────────────────────────────────────────────────────────────

  if (jsonMode) {
    const result = {};
    for (const k of allKeys) {
      const count = counts[k] ?? unknown[k] ?? 0;
      if (count > 0) {
        result[k] = { count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
      }
    }
    result.total = total;
    process.stdout.write(JSON.stringify(result) + '\n');
    return 0;
  }

  // ── Table output ──────────────────────────────────────────────────────────

  const COL1 = 12; // "NOT STARTED" is 11 chars
  const COL2 = 7;
  const COL3 = 6;

  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  const sep = `${'-'.repeat(COL1)}  ${'-'.repeat(COL2)}  ${'-'.repeat(COL3)}`;

  console.log(`${pad('Status', COL1)}  ${pad('Count', COL2)}  ${'%'.padStart(COL3)}`);
  console.log(sep);

  for (const k of allKeys) {
    const count = counts[k] ?? unknown[k] ?? 0;
    if (count === 0) continue;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    console.log(`${pad(k, COL1)}  ${padL(count, COL2)}  ${padL(pct + '%', COL3)}`);
  }

  console.log(sep);
  console.log(`${pad('Total', COL1)}  ${padL(total, COL2)}  ${padL('100%', COL3)}`);

  return 0;
}
