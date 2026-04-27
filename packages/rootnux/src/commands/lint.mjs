// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/lint.mjs
 *
 * Implements `rootnux lint`.
 *
 * Validates rootnux artifacts in cwd:
 *   - REQUIREMENTS.md: extracts R-XX IDs, checks status values, checks for duplicates
 *   - TRACEABILITY.md: extracts R-XX IDs
 *   - Cross-link: every R-XX in REQUIREMENTS must also appear in TRACEABILITY
 *   - YAML frontmatter schema check (warn if missing, don't fail)
 *
 * Exit codes:
 *   0 — clean
 *   1 — errors found
 *   2 — rootnux init not run yet
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set([
  'DONE',
  'BLOCKED',
  'PARTIAL',
  'NOT STARTED',
  'DECLINED',
  'DEFERRED',
  'FAKE',
]);

const RXX_PATTERN = /\bR-\d{1,4}\b/g;

// Column-position-independent status extraction helpers (Fix 7).
// We no longer lock R-XX to the first column — scan all cells.
const RXX_CELL_RE = /^R-\d{1,4}$/;
const STATUS_KEYWORDS = [...VALID_STATUSES].map(s => s.toUpperCase());

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ cwd?: string }} opts
 * @returns {Promise<number>} exit code
 */
export async function runLint(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const reqPath = path.join(cwd, 'requirements', 'REQUIREMENTS.md');
  const tracePath = path.join(cwd, 'requirements', 'TRACEABILITY.md');

  // ── Existence check ───────────────────────────────────────────────────────

  if (!fs.existsSync(reqPath)) {
    console.error('rootnux init not run yet (REQUIREMENTS.md missing)');
    console.error(`  Expected: ${reqPath}`);
    return 2;
  }

  const errors = [];
  const warnings = [];

  // ── Parse REQUIREMENTS.md ─────────────────────────────────────────────────

  const reqRaw = fs.readFileSync(reqPath, 'utf-8');
  const reqParsed = matter(reqRaw);

  // Frontmatter schema check (warn only)
  if (!reqParsed.data || reqParsed.data.schema !== 'rxx-v1') {
    warnings.push(`requirements/REQUIREMENTS.md: YAML frontmatter missing or schema != rxx-v1 (expected: schema: rxx-v1)`);
  }

  // Extract R-XX IDs from content with line numbers
  const reqLines = reqRaw.split('\n');
  const reqIds = new Map(); // id -> first line number (1-based)
  const reqStatusMap = new Map(); // id -> status string
  const duplicates = [];

  // Track the index of the "Status" column from the header row (Fix 7).
  // If found, we use it as a tie-breaker when no known keyword is present.
  let statusColIndex = -1; // index into pipe-split cells (excluding empty boundary cells)

  for (let i = 0; i < reqLines.length; i++) {
    const line = reqLines[i];
    const lineNo = i + 1;

    // Extract all R-XX from this line (widened to 1-4 digits, Fix 7)
    const matches = [...line.matchAll(/\bR-\d{1,4}\b/g)];
    for (const m of matches) {
      const id = m[0];
      if (reqIds.has(id)) {
        duplicates.push({ id, lineNo, firstLine: reqIds.get(id) });
      } else {
        reqIds.set(id, lineNo);
      }
    }

    if (!line.includes('|')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);

    // Detect header row: contains a cell "Status" (case-insensitive), no R-XX cells
    if (statusColIndex === -1 && !cells.some(c => RXX_CELL_RE.test(c))) {
      const idx = cells.findIndex(c => c.toLowerCase() === 'status');
      if (idx !== -1) statusColIndex = idx;
    }

    // Column-position-independent status extraction (Fix 7):
    // Find R-XX cell, then resolve the status cell via:
    //   1. A cell matching a known keyword (fast path)
    //   2. The header-derived statusColIndex (handles unknown/custom statuses)
    const rxxIndex = cells.findIndex(c => RXX_CELL_RE.test(c));
    if (rxxIndex === -1) continue;

    const rowId = cells[rxxIndex];
    // Skip separator rows (all dashes)
    if (cells.every(c => /^-+$/.test(c))) continue;

    let statusCell = cells.find(c => STATUS_KEYWORDS.includes(c.toUpperCase()));
    if (!statusCell && statusColIndex !== -1 && statusColIndex < cells.length) {
      const candidate = cells[statusColIndex];
      if (candidate && !/^-+$/.test(candidate) && !RXX_CELL_RE.test(candidate)) {
        statusCell = candidate;
      }
    }

    if (statusCell && !reqStatusMap.has(rowId)) {
      reqStatusMap.set(rowId, { status: statusCell.toUpperCase(), lineNo });
    }
  }

  // Report duplicates
  for (const { id, lineNo, firstLine } of duplicates) {
    errors.push(`requirements/REQUIREMENTS.md:${lineNo}: duplicate R-XX ID ${id} (first seen at line ${firstLine})`);
  }

  // Validate status values
  for (const [id, { status, lineNo }] of reqStatusMap) {
    if (status && !VALID_STATUSES.has(status)) {
      errors.push(
        `requirements/REQUIREMENTS.md:${lineNo}: ${id} has unknown status "${status}" ` +
        `(allowed: ${[...VALID_STATUSES].join(' | ')})`
      );
    }
  }

  // ── Parse TRACEABILITY.md ─────────────────────────────────────────────────

  let traceIds = new Set();

  if (!fs.existsSync(tracePath)) {
    warnings.push(`requirements/TRACEABILITY.md: file missing — cross-link check skipped`);
  } else {
    const traceRaw = fs.readFileSync(tracePath, 'utf-8');
    const traceParsed = matter(traceRaw);

    if (!traceParsed.data || traceParsed.data.schema !== 'rtm-v1') {
      warnings.push(`requirements/TRACEABILITY.md: YAML frontmatter missing or schema != rtm-v1`);
    }

    const traceMatches = traceRaw.matchAll(/\bR-\d{1,4}\b/g);
    for (const m of traceMatches) {
      traceIds.add(m[0]);
    }

    // Cross-link: every R-XX in REQUIREMENTS must appear in TRACEABILITY
    for (const [id, lineNo] of reqIds) {
      if (!traceIds.has(id)) {
        errors.push(
          `requirements/REQUIREMENTS.md:${lineNo}: ${id} is not traced in TRACEABILITY.md (orphan R-XX)`
        );
      }
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`WARN  ${w}`);
    }
  }

  if (errors.length === 0) {
    console.log(`rootnux lint: OK — ${reqIds.size} requirement(s) validated, no errors`);
    return 0;
  }

  for (const e of errors) {
    console.error(`ERROR ${e}`);
  }
  console.error(`\nrootnux lint: FAILED — ${errors.length} error(s) found`);
  return 1;
}
