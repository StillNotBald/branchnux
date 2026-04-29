// Copyright 2026 Chu Ling - SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { buildGraph, Graph } from '../src/lib/graph.mjs';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REQS = [
  { id: 'R-01', title: 'Authentication', status: 'DONE' },
  { id: 'R-02', title: 'Authorization', status: 'DONE' },
  { id: 'R-03', title: 'Rate Limiting', status: 'PARTIAL' },
  { id: 'R-04', title: 'Audit Logging', status: 'BLOCKED' },
  { id: 'R-05', title: 'Encryption', status: 'OPEN' },
];

const SPRINTS = [
  { path: 'sprint-log/2026-01-auth/', shippedRIds: ['R-01', 'R-02'], decisions: ['Used JWT'] },
  { path: 'sprint-log/2026-02-infra/', shippedRIds: ['R-03', 'R-01'], decisions: [] },
];

const TESTS = [
  {
    path: 'testing-log/2026-01-auth/test-plan.md',
    slug: 'auth-tests',
    rIds: ['R-01', 'R-02'],
    tcs: [
      { id: 'TC-01', description: 'Login with valid creds', status: 'PASS', notes: '' },
      { id: 'TC-02', description: 'Reject bad password', status: 'PASS', notes: '' },
    ],
  },
  {
    path: 'testing-log/2026-02-rate/test-plan.md',
    slug: 'rate-tests',
    rIds: ['R-03'],
    tcs: [{ id: 'TC-10', description: 'Rate limit after 100 req', status: 'FAIL', notes: 'flaky' }],
  },
];

const CODE = new Map([
  ['R-01', ['src/auth.js:10', 'src/auth.js:55']],
  ['R-02', ['src/rbac.js:22']],
  ['R-03', ['src/rate-limit.js:5']],
]);

const INDUSTRY = {
  standards: [
    { id: 'CTRL-1', name: 'Access Control', r_ids: ['R-01', 'R-02'] },
    { id: 'CTRL-2', name: 'Logging', r_ids: ['R-04'] },
    { id: 'CTRL-3', name: 'Generic', r_ids: null }, // no r_ids binding
  ],
};

// ── buildGraph ────────────────────────────────────────────────────────────────

describe('buildGraph', () => {
  it('happy path: returns a Graph instance', () => {
    const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });
    expect(g).toBeInstanceOf(Graph);
  });

  it('happy path: rIds includes all 5 requirements', () => {
    const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });
    expect(g.rIds).toHaveLength(5);
    expect(g.rIds).toContain('R-01');
    expect(g.rIds).toContain('R-05');
  });

  it('empty inputs: returns Graph with no requirements', () => {
    const g = buildGraph({});
    expect(g).toBeInstanceOf(Graph);
    expect(g.rIds).toHaveLength(0);
  });

  it('empty inputs: coverageStats all-zeros', () => {
    const g = buildGraph({});
    expect(g.coverageStats()).toEqual({
      totalRIds: 0,
      withTests: 0,
      withCode: 0,
      withSprint: 0,
      coverage: 0,
    });
  });

  it('duplicate R-IDs in requirements: last one wins (Map semantics)', () => {
    const dupeReqs = [
      { id: 'R-01', title: 'First', status: 'OPEN' },
      { id: 'R-01', title: 'Second', status: 'DONE' },
    ];
    const g = buildGraph({ requirements: dupeReqs });
    expect(g.getReq('R-01').title).toBe('Second');
    expect(g.rIds).toHaveLength(1);
  });
});

// ── Graph.findEvidence ────────────────────────────────────────────────────────

describe('Graph.findEvidence', () => {
  const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });

  it('returns sprint, code, and tests for a known R-ID', () => {
    const ev = g.findEvidence('R-01');
    expect(ev).toHaveProperty('sprint');
    expect(ev).toHaveProperty('code');
    expect(ev).toHaveProperty('tests');
  });

  it('sprint paths for R-01 include both sprints that shipped it', () => {
    const { sprint } = g.findEvidence('R-01');
    expect(sprint).toContain('sprint-log/2026-01-auth/');
    expect(sprint).toContain('sprint-log/2026-02-infra/');
  });

  it('code refs for R-01 returned correctly', () => {
    const { code } = g.findEvidence('R-01');
    expect(code).toContain('src/auth.js:10');
    expect(code).toContain('src/auth.js:55');
  });

  it('tests for R-02 includes the auth test plan', () => {
    const { tests } = g.findEvidence('R-02');
    expect(tests[0].slug).toBe('auth-tests');
    expect(tests[0].tcs).toHaveLength(2);
  });

  it('unknown R-ID: returns empty arrays (not null/undefined)', () => {
    const ev = g.findEvidence('R-99');
    expect(ev.sprint).toEqual([]);
    expect(ev.code).toEqual([]);
    expect(ev.tests).toEqual([]);
  });

  it('R-05 (no evidence): all arrays empty', () => {
    const ev = g.findEvidence('R-05');
    expect(ev.sprint).toHaveLength(0);
    expect(ev.code).toHaveLength(0);
    expect(ev.tests).toHaveLength(0);
  });
});

// ── Graph.findControls ────────────────────────────────────────────────────────

describe('Graph.findControls', () => {
  const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });

  it('returns controls matching the R-ID via industryConfig.standards', () => {
    const controls = g.findControls('R-01', INDUSTRY);
    // CTRL-1 has r_ids: ['R-01', 'R-02'] → matched
    // CTRL-3 has r_ids: null → always included (no r_ids binding)
    // CTRL-2 has r_ids: ['R-04'] → not matched for R-01
    expect(controls.map((c) => c.id)).toContain('CTRL-1');
    expect(controls.map((c) => c.id)).not.toContain('CTRL-2');
  });

  it('R-04 maps to CTRL-2 via industryConfig', () => {
    const controls = g.findControls('R-04', INDUSTRY);
    expect(controls[0].id).toBe('CTRL-2');
  });

  it('controls without r_ids binding (null): always included', () => {
    const controls = g.findControls('R-99', INDUSTRY);
    // CTRL-3 has r_ids: null → included for any rid
    expect(controls.some((c) => c.id === 'CTRL-3')).toBe(true);
  });

  it('null industryConfig: falls back to internal controls array (empty)', () => {
    const controls = g.findControls('R-01', null);
    expect(Array.isArray(controls)).toBe(true);
    expect(controls).toHaveLength(0); // no internal controls were passed
  });

  it('empty industryConfig.standards: returns []', () => {
    const controls = g.findControls('R-01', { standards: [] });
    expect(controls).toEqual([]);
  });

  it('R-ID not in any control r_ids: only unbound controls returned', () => {
    const controls = g.findControls('R-03', INDUSTRY);
    // R-03 not in CTRL-1 or CTRL-2 r_ids; CTRL-3 (null r_ids) is always included
    expect(controls.every((c) => c.r_ids === null || (Array.isArray(c.r_ids) && c.r_ids.includes('R-03')))).toBe(true);
  });
});

// ── Graph.coverageStats ───────────────────────────────────────────────────────

describe('Graph.coverageStats', () => {
  it('returns correct counts for the full fixture set', () => {
    const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });
    const stats = g.coverageStats();

    expect(stats.totalRIds).toBe(5);
    // R-01, R-02, R-03 have tests
    expect(stats.withTests).toBe(3);
    // R-01, R-02, R-03 have code annotations
    expect(stats.withCode).toBe(3);
    // R-01, R-02, R-03 have sprint coverage
    expect(stats.withSprint).toBe(3);
    // coverage % — R-04 and R-05 have nothing, so 3/5 = 60%
    expect(stats.coverage).toBe(60);
  });

  it('all-zero edge case: no requirements', () => {
    const g = buildGraph({});
    expect(g.coverageStats()).toEqual({
      totalRIds: 0,
      withTests: 0,
      withCode: 0,
      withSprint: 0,
      coverage: 0,
    });
  });

  it('requirements but no sprints/tests/code: coverage is 0%', () => {
    const g = buildGraph({ requirements: REQS });
    const stats = g.coverageStats();
    expect(stats.totalRIds).toBe(5);
    expect(stats.withTests).toBe(0);
    expect(stats.withCode).toBe(0);
    expect(stats.withSprint).toBe(0);
    expect(stats.coverage).toBe(0);
  });

  it('returned object has exactly the 5 expected keys', () => {
    const g = buildGraph({ requirements: REQS, sprints: SPRINTS, tests: TESTS, code: CODE });
    const stats = g.coverageStats();
    expect(Object.keys(stats).sort()).toEqual(
      ['coverage', 'totalRIds', 'withCode', 'withSprint', 'withTests'].sort()
    );
  });
});
