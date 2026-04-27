// Copyright 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/lib/parser.mjs
 *
 * Pure parsing functions for the RTM + SCA pipeline.
 * Every function returns structured data — no side effects, no I/O.
 * Callers are responsible for reading files and passing content strings.
 *
 * Functions:
 *   parseRequirements(content)    → {id, title, status}[]
 *   parseSprintSummary(content)   → {shippedRIds, decisions}
 *   parseTestPlan(content)        → {slug, tcPrefix, rIds, tcs}
 *   parseCodeAnnotations(lines, ridPattern) → Map<string, string[]>
 */

import matter from 'gray-matter';

// R-ID pattern: R-01, R-001, R-01A, etc.
export const RID_PATTERN = /\bR-\d{2,4}[A-Z]?\b/g;

// ── parseRequirements ─────────────────────────────────────────────────────────

/**
 * Parse a REQUIREMENTS.md file content.
 *
 * Accepts two heading styles:
 *   ## R-01 Title text here
 *   ## R-01 — Title text here
 *
 * Also extracts status badges if present on the same line or the next:
 *   **Status:** DONE | IN PROGRESS | PARTIAL | BLOCKED | DEFERRED | OPEN
 *
 * @param {string} content - full file content
 * @returns {{ id: string, title: string, status: string }[]}
 */
export function parseRequirements(content) {
  if (!content || typeof content !== 'string') return [];

  const lines = content.split('\n');
  const results = [];

  // Heading regex: ## R-01 Title  OR  ## R-01 — Title
  const headingRe = /^#{1,3}\s+(R-\d{2,4}[A-Z]?)\s*(?:[-—]+\s*)?(.+)?$/;
  const statusRe = /\*\*Status:\*\*\s*(\w[\w ]*\w|\w+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = headingRe.exec(line);
    if (!m) continue;

    const id = m[1];
    const rawTitle = (m[2] ?? '').trim();
    // Strip trailing badge markup like `**Status: DONE**`
    const title = rawTitle.replace(/\s*\*\*Status:[^*]+\*\*/gi, '').trim();

    // Look ahead up to 5 lines for a Status: line
    let status = 'UNKNOWN';
    const lookAhead = Math.min(i + 5, lines.length);
    for (let j = i; j < lookAhead; j++) {
      const sm = statusRe.exec(lines[j]);
      if (sm) {
        status = sm[1].trim().toUpperCase();
        break;
      }
    }

    results.push({ id, title: title || id, status });
  }

  return results;
}

// ── parseSprintSummary ────────────────────────────────────────────────────────

/**
 * Parse a SPRINT_SUMMARY.md (or similar) for shipped R-IDs and decisions.
 *
 * Shipped R-IDs are extracted from any line containing R-XX references.
 * Decision lines are lines that start with a bullet and contain "decision" or
 * "decided" (case-insensitive).
 *
 * @param {string} content - full file content
 * @returns {{ shippedRIds: string[], decisions: string[] }}
 */
export function parseSprintSummary(content) {
  if (!content || typeof content !== 'string') return { shippedRIds: [], decisions: [] };

  const shippedSet = new Set();
  const decisions = [];

  for (const line of content.split('\n')) {
    // Collect all R-IDs on this line
    const matches = line.match(RID_PATTERN);
    if (matches) {
      for (const rid of matches) shippedSet.add(rid);
    }

    // Collect decision lines
    if (/^\s*[-*]\s+.*\bdecid/i.test(line)) {
      decisions.push(line.replace(/^\s*[-*]\s+/, '').trim());
    }
  }

  return { shippedRIds: [...shippedSet].sort(), decisions };
}

// ── parseTestPlan ─────────────────────────────────────────────────────────────

/**
 * Parse a test-plan.md file with gray-matter frontmatter.
 *
 * Expected frontmatter keys (all optional — graceful degradation):
 *   slug, tc_prefix, r_ids (array), industry
 *
 * Also scans the body for:
 *   - describe('R-XX', ...) patterns
 *   - // R-XX inline markers
 *   - TC table rows
 *
 * @param {string} content - full file content including frontmatter
 * @returns {{ slug: string, tcPrefix: string, rIds: string[], tcs: object[] }}
 */
export function parseTestPlan(content) {
  if (!content || typeof content !== 'string') {
    return { slug: '', tcPrefix: '', rIds: [], tcs: [] };
  }

  let fm = {};
  let body = content;
  try {
    const parsed = matter(content);
    fm = parsed.data ?? {};
    body = parsed.content ?? content;
  } catch {
    // Malformed frontmatter — use full content as body
  }

  const slug = String(fm.slug ?? '');
  const tcPrefix = String(fm.tc_prefix ?? fm.tcPrefix ?? '');
  const fmRIds = Array.isArray(fm.r_ids)
    ? fm.r_ids.map(String)
    : typeof fm.r_ids === 'string'
    ? fm.r_ids.split(/[\s,;]+/).filter(Boolean)
    : [];

  // Scan body for additional R-IDs
  const bodyRIds = [...(body.match(RID_PATTERN) ?? [])];

  const allRIds = [...new Set([...fmRIds, ...bodyRIds])].sort();

  // Extract TC rows from markdown tables:
  // | TC-01 | description | PASS | ... |
  const tcs = [];
  const tcRowRe = /^\|\s*(TC-[\w-]+)\s*\|(.+)\|$/;
  for (const line of body.split('\n')) {
    const m = tcRowRe.exec(line);
    if (!m) continue;
    const cells = m[2].split('|').map((c) => c.trim());
    tcs.push({
      id: m[1].trim(),
      description: cells[0] ?? '',
      status: cells[1] ?? '',
      notes: cells[2] ?? '',
    });
  }

  return { slug, tcPrefix, rIds: allRIds, tcs };
}

// ── parseCodeAnnotations ──────────────────────────────────────────────────────

/**
 * Extract R-ID annotations from lines of source code.
 *
 * Accepts pre-split {file, lineNumber, text} records (so the caller controls
 * which files are read — keeps this function pure).
 *
 * Recognises:
 *   // R-01
 *   // R-01, R-02
 *   /* R-01 *\/
 *   # R-01   (Python / shell comments)
 *   describe('R-01', ...)
 *   describe("R-01", ...)
 *
 * @param {{ file: string, lineNumber: number, text: string }[]} lines
 * @returns {Map<string, string[]>}  rid → ['file:line', ...]
 */
export function parseCodeAnnotations(lines) {
  /** @type {Map<string, string[]>} */
  const map = new Map();

  for (const { file, lineNumber, text } of lines) {
    const matches = text.match(RID_PATTERN);
    if (!matches) continue;

    for (const rid of matches) {
      const ref = `${file}:${lineNumber}`;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid).push(ref);
    }
  }

  return map;
}
