// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * src/lib/graph.mjs
 *
 * In-memory graph that connects requirements → sprints → code → tests → controls.
 *
 * Usage:
 *   const g = buildGraph({ requirements, sprints, tests, code, controls });
 *   g.findEvidence('R-01')       → { sprint: [...], code: [...], tests: [...] }
 *   g.findControls('R-01', cfg)  → Control[]
 *   g.coverageStats()            → { totalRIds, withTests, withCode, withSprint }
 */

// ── buildGraph ────────────────────────────────────────────────────────────────

/**
 * Build the in-memory evidence graph.
 *
 * @param {{
 *   requirements : { id: string, title: string, status: string }[],
 *   sprints      : { path: string, shippedRIds: string[], decisions: string[] }[],
 *   tests        : { path: string, slug: string, rIds: string[], tcs: object[] }[],
 *   code         : Map<string, string[]>,   // rid → file:line[]
 *   controls     : object[],                // from industry JSON (optional)
 * }} input
 * @returns {Graph}
 */
export function buildGraph({ requirements = [], sprints = [], tests = [], code = new Map(), controls = [] }) {
  return new Graph({ requirements, sprints, tests, code, controls });
}

// ── Graph class ───────────────────────────────────────────────────────────────

export class Graph {
  /**
   * @param {{
   *   requirements : { id: string, title: string, status: string }[],
   *   sprints      : { path: string, shippedRIds: string[], decisions: string[] }[],
   *   tests        : { path: string, slug: string, rIds: string[], tcs: object[] }[],
   *   code         : Map<string, string[]>,
   *   controls     : object[],
   * }} data
   */
  constructor({ requirements, sprints, tests, code, controls }) {
    /** @type {Map<string, { id: string, title: string, status: string }>} */
    this._req = new Map(requirements.map((r) => [r.id, r]));

    /** @type {Map<string, string[]>} rid → sprint paths */
    this._sprintIndex = _indexBy(sprints, (s) => s.shippedRIds, (s) => s.path);

    /** @type {Map<string, { path: string, tcs: object[] }[]>} rid → test plans */
    this._testIndex = new Map();
    for (const tp of tests) {
      for (const rid of tp.rIds) {
        if (!this._testIndex.has(rid)) this._testIndex.set(rid, []);
        this._testIndex.get(rid).push({ path: tp.path, slug: tp.slug, tcs: tp.tcs });
      }
    }

    /** @type {Map<string, string[]>} rid → code refs */
    this._code = code;

    /** @type {object[]} */
    this._controls = controls;
  }

  /**
   * All requirement IDs in the graph.
   * @returns {string[]}
   */
  get rIds() {
    return [...this._req.keys()].sort();
  }

  /**
   * Requirement record for a given ID, or undefined.
   * @param {string} rid
   */
  getReq(rid) {
    return this._req.get(rid);
  }

  /**
   * Find all evidence for a requirement ID.
   *
   * @param {string} rid
   * @returns {{
   *   sprint : string[],   // sprint folder paths that shipped this R-ID
   *   code   : string[],   // file:line refs from inline comments
   *   tests  : { path: string, slug: string, tcs: object[] }[],
   * }}
   */
  findEvidence(rid) {
    return {
      sprint: this._sprintIndex.get(rid) ?? [],
      code: this._code.get(rid) ?? [],
      tests: this._testIndex.get(rid) ?? [],
    };
  }

  /**
   * Find controls relevant to a requirement, filtered by an industry config.
   *
   * Matching is heuristic: a control is returned when its tags or references
   * mention the R-ID, or when no filter is present (all controls returned).
   *
   * @param {string} rid
   * @param {object|null} industryConfig - parsed industry JSON (optional)
   * @returns {object[]}
   */
  findControls(rid, industryConfig = null) {
    const pool = industryConfig?.standards ?? this._controls;
    if (!pool || pool.length === 0) return [];

    return pool.filter((ctrl) => {
      // If control has explicit r_ids binding, match exactly
      if (Array.isArray(ctrl.r_ids)) return ctrl.r_ids.includes(rid);
      // Otherwise include all controls (caller slices/filters as needed)
      return true;
    });
  }

  /**
   * Aggregate coverage statistics across all requirements.
   *
   * @returns {{
   *   totalRIds  : number,
   *   withTests  : number,
   *   withCode   : number,
   *   withSprint : number,
   *   coverage   : number,  // percentage of RIds that have at least one of: test|code|sprint
   * }}
   */
  coverageStats() {
    let withTests = 0;
    let withCode = 0;
    let withSprint = 0;
    let withAny = 0;

    for (const rid of this._req.keys()) {
      const hasTests = (this._testIndex.get(rid)?.length ?? 0) > 0;
      const hasCode = (this._code.get(rid)?.length ?? 0) > 0;
      const hasSprint = (this._sprintIndex.get(rid)?.length ?? 0) > 0;

      if (hasTests) withTests++;
      if (hasCode) withCode++;
      if (hasSprint) withSprint++;
      if (hasTests || hasCode || hasSprint) withAny++;
    }

    const totalRIds = this._req.size;
    const coverage = totalRIds === 0 ? 0 : Math.round((withAny / totalRIds) * 100);

    return { totalRIds, withTests, withCode, withSprint, coverage };
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build a reverse index: for each item in `items`, extract key strings via
 * `keysFn`, and map each key → value produced by `valueFn`.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string[]} keysFn
 * @param {(item: T) => string} valueFn
 * @returns {Map<string, string[]>}
 */
function _indexBy(items, keysFn, valueFn) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const item of items) {
    const val = valueFn(item);
    for (const key of keysFn(item)) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(val);
    }
  }
  return map;
}
