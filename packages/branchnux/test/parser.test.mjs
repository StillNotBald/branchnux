// Copyright 2026 Chu Ling - SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
  parseRequirements,
  parseSprintSummary,
  parseTestPlan,
  parseCodeAnnotations,
} from '../src/lib/parser.mjs';

// ── parseRequirements ─────────────────────────────────────────────────────────

describe('parseRequirements', () => {
  it('happy path: parses ## R-01 Title headings', () => {
    const content = `# Requirements

## R-01 Authentication
**Status:** DONE

Some description here.

## R-02 Authorization
**Status:** PARTIAL
`;
    const result = parseRequirements(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'R-01', title: 'Authentication', status: 'DONE' });
    expect(result[1]).toEqual({ id: 'R-02', title: 'Authorization', status: 'PARTIAL' });
  });

  it('happy path: parses ## R-01 — Title (em-dash style) headings', () => {
    const content = `## R-10 — Audit Logging\n**Status:** DONE\n`;
    const result = parseRequirements(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('R-10');
    expect(result[0].title).toBe('Audit Logging');
    expect(result[0].status).toBe('DONE');
  });

  it('empty string: returns []', () => {
    expect(parseRequirements('')).toEqual([]);
  });

  it('null / non-string: returns []', () => {
    expect(parseRequirements(null)).toEqual([]);
    expect(parseRequirements(undefined)).toEqual([]);
    expect(parseRequirements(42)).toEqual([]);
  });

  it('BLOCKED status parsed correctly', () => {
    const content = `## R-05 Rate Limiting\n**Status:** BLOCKED\n`;
    const [req] = parseRequirements(content);
    expect(req.status).toBe('BLOCKED');
  });

  it('PARTIAL and DEFERRED statuses parsed correctly', () => {
    const content = `## R-06 Encryption\n**Status:** PARTIAL\n\n## R-07 Archival\n**Status:** DEFERRED\n`;
    const result = parseRequirements(content);
    expect(result[0].status).toBe('PARTIAL');
    expect(result[1].status).toBe('DEFERRED');
  });

  it('no status in heading area → status defaults to UNKNOWN', () => {
    const content = `## R-08 Dark Mode\n\nSome paragraph without a status badge.\n`;
    const [req] = parseRequirements(content);
    expect(req.status).toBe('UNKNOWN');
  });

  it('malformed heading (single #): still parsed (headingRe allows 1-3 hashes)', () => {
    // The regex accepts #{1,3} so single-hash should still match
    const content = `# R-09 Login\n**Status:** DONE\n`;
    const result = parseRequirements(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('R-09');
  });

  it('#### heading (four hashes): NOT parsed (outside #{1,3})', () => {
    const content = `#### R-10 Deep Heading\n**Status:** DONE\n`;
    const result = parseRequirements(content);
    expect(result).toHaveLength(0);
  });

  it('multiple requirements from a realistic file', () => {
    const content = [
      '# Requirements',
      '',
      '## R-01 — User Registration',
      '**Status:** DONE',
      '',
      '## R-02 Password Reset',
      '**Status:** IN PROGRESS',
      '',
      '## R-03 — Two-Factor Auth',
      '**Status:** OPEN',
    ].join('\n');

    const result = parseRequirements(content);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['R-01', 'R-02', 'R-03']);
  });

  it('status badge inline on heading line is stripped from title', () => {
    const content = `## R-11 Access Control **Status: DONE**\n`;
    const [req] = parseRequirements(content);
    expect(req.title).not.toContain('Status');
  });
});

// ── parseSprintSummary ────────────────────────────────────────────────────────

describe('parseSprintSummary', () => {
  it('happy path: extracts R-IDs from shipped lines', () => {
    const content = `# Sprint 1\n\nShipped R-01, R-02 and also R-03.\n`;
    const result = parseSprintSummary(content);
    expect(result.shippedRIds).toContain('R-01');
    expect(result.shippedRIds).toContain('R-02');
    expect(result.shippedRIds).toContain('R-03');
  });

  it('multi-line shipped lists: all R-IDs collected', () => {
    const content = [
      '## Shipped',
      '- R-10 authentication module',
      '- R-11 session handling',
      '- R-12 and R-13 together',
    ].join('\n');
    const { shippedRIds } = parseSprintSummary(content);
    expect(shippedRIds).toEqual(expect.arrayContaining(['R-10', 'R-11', 'R-12', 'R-13']));
  });

  it('no R-IDs anywhere: returns empty shippedRIds', () => {
    const content = `# Sprint summary\n\nNo requirements this sprint.\n`;
    const { shippedRIds } = parseSprintSummary(content);
    expect(shippedRIds).toEqual([]);
  });

  it('empty string: returns empty struct', () => {
    expect(parseSprintSummary('')).toEqual({ shippedRIds: [], decisions: [] });
  });

  it('null / non-string: returns empty struct', () => {
    expect(parseSprintSummary(null)).toEqual({ shippedRIds: [], decisions: [] });
  });

  it('decision lines are extracted', () => {
    const content = [
      '## Decisions',
      '- Decided to use PostgreSQL for the main store',
      '- decided against Redis for sessions',
    ].join('\n');
    const { decisions } = parseSprintSummary(content);
    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toMatch(/PostgreSQL/);
  });

  it('duplicate R-IDs are deduplicated', () => {
    const content = `R-01 was mentioned here and also R-01 again below.\n`;
    const { shippedRIds } = parseSprintSummary(content);
    expect(shippedRIds.filter((id) => id === 'R-01')).toHaveLength(1);
  });

  it('shippedRIds are returned sorted', () => {
    const content = `R-05 R-01 R-03\n`;
    const { shippedRIds } = parseSprintSummary(content);
    expect(shippedRIds).toEqual([...shippedRIds].sort());
  });
});

// ── parseTestPlan ─────────────────────────────────────────────────────────────

describe('parseTestPlan', () => {
  it('happy path: parses YAML frontmatter and TC table', () => {
    const content = `---
slug: auth-tests
tc_prefix: AUTH
r_ids:
  - R-01
  - R-02
---

# Auth Test Plan

| TC-01 | Correct credentials allows login | PASS | |
| TC-02 | Wrong password is rejected | PASS | edge |
`;
    const result = parseTestPlan(content);
    expect(result.slug).toBe('auth-tests');
    expect(result.tcPrefix).toBe('AUTH');
    expect(result.rIds).toContain('R-01');
    expect(result.rIds).toContain('R-02');
    expect(result.tcs).toHaveLength(2);
    expect(result.tcs[0].id).toBe('TC-01');
    expect(result.tcs[0].status).toBe('PASS');
  });

  it('missing frontmatter: returns empty slug/tcPrefix, body R-IDs extracted', () => {
    const content = `# Test Plan for R-05 and R-06\n\nSome inline references to R-07.\n`;
    const result = parseTestPlan(content);
    expect(result.slug).toBe('');
    expect(result.tcPrefix).toBe('');
    expect(result.rIds).toContain('R-05');
    expect(result.rIds).toContain('R-06');
    expect(result.rIds).toContain('R-07');
  });

  it('empty string: returns safe empty struct', () => {
    const result = parseTestPlan('');
    expect(result).toEqual({ slug: '', tcPrefix: '', rIds: [], tcs: [] });
  });

  it('null: returns safe empty struct', () => {
    const result = parseTestPlan(null);
    expect(result).toEqual({ slug: '', tcPrefix: '', rIds: [], tcs: [] });
  });

  it('r_ids as comma-separated string in frontmatter: parsed correctly', () => {
    const content = `---\nslug: foo\nr_ids: "R-10, R-11, R-12"\n---\n`;
    const result = parseTestPlan(content);
    expect(result.rIds).toContain('R-10');
    expect(result.rIds).toContain('R-11');
    expect(result.rIds).toContain('R-12');
  });

  it('TC table with notes column: all cells mapped', () => {
    const content = `---\nslug: s\n---\n| TC-05 | Register new user | FAIL | needs fix |\n`;
    const result = parseTestPlan(content);
    expect(result.tcs[0].notes).toBe('needs fix');
    expect(result.tcs[0].status).toBe('FAIL');
  });

  it('body R-IDs are merged with frontmatter R-IDs, deduplicated and sorted', () => {
    const content = `---\nr_ids:\n  - R-01\n---\nBody mentions R-01 again and R-03.\n`;
    const result = parseTestPlan(content);
    expect(result.rIds.filter((id) => id === 'R-01')).toHaveLength(1);
    expect(result.rIds).toContain('R-03');
    expect(result.rIds).toEqual([...result.rIds].sort());
  });
});

// ── parseCodeAnnotations ──────────────────────────────────────────────────────

describe('parseCodeAnnotations', () => {
  it('happy path: maps R-IDs to file:line refs', () => {
    const lines = [
      { file: 'src/auth.js', lineNumber: 10, text: '// R-01 handles login' },
      { file: 'src/auth.js', lineNumber: 20, text: '// R-02 handles logout' },
      { file: 'src/session.js', lineNumber: 5, text: '// R-01, R-03 session check' },
    ];
    const map = parseCodeAnnotations(lines);
    expect(map.get('R-01')).toEqual(['src/auth.js:10', 'src/session.js:5']);
    expect(map.get('R-02')).toEqual(['src/auth.js:20']);
    expect(map.get('R-03')).toEqual(['src/session.js:5']);
  });

  it('no matches: returns empty Map', () => {
    const lines = [
      { file: 'src/foo.js', lineNumber: 1, text: 'const x = 1;' },
      { file: 'src/foo.js', lineNumber: 2, text: '// no requirement here' },
    ];
    const map = parseCodeAnnotations(lines);
    expect(map.size).toBe(0);
  });

  it('multiple matches per file are all captured', () => {
    const lines = [
      { file: 'src/payments.js', lineNumber: 100, text: '// R-10, R-11, R-12 payment logic' },
    ];
    const map = parseCodeAnnotations(lines);
    expect(map.get('R-10')).toEqual(['src/payments.js:100']);
    expect(map.get('R-11')).toEqual(['src/payments.js:100']);
    expect(map.get('R-12')).toEqual(['src/payments.js:100']);
  });

  it('empty lines array: returns empty Map', () => {
    const map = parseCodeAnnotations([]);
    expect(map.size).toBe(0);
  });

  it('Python/shell-style # comments recognized via RID_PATTERN', () => {
    const lines = [{ file: 'scripts/seed.py', lineNumber: 3, text: '# R-20 data seeding' }];
    const map = parseCodeAnnotations(lines);
    expect(map.get('R-20')).toEqual(['scripts/seed.py:3']);
  });

  it('describe() patterns recognized', () => {
    const lines = [
      { file: 'test/auth.spec.js', lineNumber: 1, text: "describe('R-05', () => {" },
    ];
    const map = parseCodeAnnotations(lines);
    expect(map.get('R-05')).toEqual(['test/auth.spec.js:1']);
  });

  it('same R-ID across multiple files: all refs collected', () => {
    const lines = [
      { file: 'src/a.js', lineNumber: 1, text: '// R-30' },
      { file: 'src/b.js', lineNumber: 2, text: '// R-30' },
      { file: 'src/c.js', lineNumber: 3, text: '// R-30' },
    ];
    const map = parseCodeAnnotations(lines);
    expect(map.get('R-30')).toHaveLength(3);
    expect(map.get('R-30')).toContain('src/b.js:2');
  });
});
