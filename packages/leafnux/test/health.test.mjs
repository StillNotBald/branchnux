// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/health.test.mjs
 *
 * Tests for `leafnux health [--json] [--quiet] [--check <category>]`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runHealth } from '../src/commands/health.mjs';

// ── Fixtures ──────────────────────────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leafnux-health-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function writeFile(relPath, content) {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

function writeDir(relPath) {
  fs.mkdirSync(path.join(tmpDir, relPath), { recursive: true });
}

/** Capture stdout during an async call; return parsed JSON. */
async function captureJson(fn) {
  const written = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => { written.push(String(chunk)); return true; };
  try {
    await fn();
  } finally {
    process.stdout.write = orig;
  }
  return JSON.parse(written.join('').trim());
}

/** Capture console.log lines during an async call. */
async function captureLines(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.log = orig;
  }
  return lines;
}

/** Date string offset from today by +/- days */
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Sample content builders ───────────────────────────────────────────────────

function makeRequirements(rows) {
  const header = `| # | Requirement | Status | Notes |\n|---|-------------|--------|-------|\n`;
  return `---\ntitle: Requirements\nschema: rxx-v1\n---\n\n${header}${rows}`;
}

function makeRisks(rows) {
  return `| Risk | Description | Status | Severity |\n|------|-------------|--------|----------|\n${rows}`;
}

function makeAdr(status, n = '0001', title = 'test-adr') {
  return `---\nadr: "${n}"\ntitle: "${title}"\nstatus: ${status}\ndate: 2026-01-01\n---\n\n# ADR-${n}\n`;
}

// ── Test: empty cwd (no artifacts) ───────────────────────────────────────────

describe('empty cwd', () => {
  it('all categories amber when no artifacts exist', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.overall).toBe('amber');
    expect(json.categories.requirements.status).toBe('amber');
    expect(json.categories.risks.status).toBe('amber');
    expect(json.categories.adrs.status).toBe('amber');
    expect(json.categories.sprint.status).toBe('amber');
    expect(json.categories.tests.status).toBe('amber');
  });

  it('overall is AMBER for empty cwd', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.overall).toBe('amber');
  });
});

// ── Test: full healthy state ──────────────────────────────────────────────────

describe('full healthy state → overall GREEN', () => {
  beforeEach(() => {
    // Requirements: 9/10 DONE = 90% → GREEN
    writeFile(
      'requirements/REQUIREMENTS.md',
      makeRequirements(
        Array.from({ length: 9 }, (_, i) => `| R-0${i + 1} | req | DONE | |\n`).join('') +
        `| R-10 | req | PARTIAL | |\n`
      )
    );

    // Risks: 0 OPEN → GREEN
    writeFile(
      'requirements/risks/risks.md',
      makeRisks('| R001 | Something | MITIGATED | HIGH |\n')
    );

    // ADRs: 2 accepted → GREEN
    writeFile('docs/adr/0001-use-esm.md', makeAdr('accepted'));
    writeFile('docs/adr/0002-use-vitest.md', makeAdr('accepted', '0002', 'use-vitest'));

    // Sprint: 2 days ago → GREEN
    const recentDate = dateOffset(-2);
    writeDir(`sprint-log/${recentDate}_my-sprint`);

    // Tests: root package.json with test script
    writeFile('package.json', JSON.stringify({ name: 'my-project', scripts: { test: 'vitest run' } }));
  });

  it('overall is green', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.overall).toBe('green');
  });

  it('requirements green (≥80% done)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.requirements.status).toBe('green');
    expect(json.categories.requirements.pct).toBeGreaterThanOrEqual(80);
  });

  it('risks green (0 OPEN)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.risks.status).toBe('green');
    expect(json.categories.risks.openCount).toBe(0);
  });

  it('adrs green (all accepted)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.adrs.status).toBe('green');
  });

  it('sprint green (≤7 days)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.sprint.status).toBe('green');
    expect(json.categories.sprint.days).toBeLessThanOrEqual(7);
  });
});

// ── Test: one RED category → overall RED ─────────────────────────────────────

describe('one category RED → overall RED', () => {
  it('≥4 OPEN risks → risks RED → overall RED', async () => {
    writeFile(
      'requirements/risks/risks.md',
      makeRisks(
        `| R001 | a | OPEN | HIGH |\n` +
        `| R002 | b | OPEN | HIGH |\n` +
        `| R003 | c | OPEN | MED |\n` +
        `| R004 | d | OPEN | LOW |\n` +
        `| R005 | e | MITIGATED | LOW |\n`
      )
    );

    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.risks.status).toBe('red');
    expect(json.categories.risks.openCount).toBe(4);
    expect(json.overall).toBe('red');
  });

  it('<50% DONE requirements → requirements RED → overall RED', async () => {
    writeFile(
      'requirements/REQUIREMENTS.md',
      makeRequirements(
        `| R-01 | a | DONE | |\n` +
        `| R-02 | b | NOT STARTED | |\n` +
        `| R-03 | c | NOT STARTED | |\n` +
        `| R-04 | d | NOT STARTED | |\n`
      )
    );

    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json.categories.requirements.status).toBe('red');
    expect(json.overall).toBe('red');
  });
});

// ── Test: --json output shape ─────────────────────────────────────────────────

describe('--json output shape', () => {
  it('has overall + categories keys', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(json).toHaveProperty('overall');
    expect(json).toHaveProperty('categories');
    expect(json.categories).toHaveProperty('requirements');
    expect(json.categories).toHaveProperty('risks');
    expect(json.categories).toHaveProperty('adrs');
    expect(json.categories).toHaveProperty('sprint');
    expect(json.categories).toHaveProperty('tests');
  });

  it('each category has status and label', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    for (const cat of ['requirements', 'risks', 'adrs', 'sprint', 'tests']) {
      expect(json.categories[cat]).toHaveProperty('status');
      expect(json.categories[cat]).toHaveProperty('label');
    }
  });

  it('overall is one of green|amber|red', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true })
    );
    expect(['green', 'amber', 'red']).toContain(json.overall);
  });

  it('returns 0 (not quiet exit code) with --json', async () => {
    const code = await (async () => {
      const written = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk) => { written.push(String(chunk)); return true; };
      try {
        return await runHealth({ cwd: tmpDir, json: true });
      } finally {
        process.stdout.write = orig;
      }
    })();
    expect(code).toBe(0);
  });
});

// ── Test: --quiet exit codes ──────────────────────────────────────────────────

describe('--quiet exit codes', () => {
  it('exit 1 (AMBER) for empty cwd', async () => {
    const lines = await captureLines(() =>
      runHealth({ cwd: tmpDir, quiet: true })
    );
    // The return value is the exit code
    const code = await runHealth({ cwd: tmpDir, quiet: true });
    expect(code).toBe(1);
  });

  it('exit 0 (GREEN) for healthy state', async () => {
    // 9/10 DONE, 0 risks, accepted ADRs, fresh sprint, test script
    writeFile('requirements/REQUIREMENTS.md',
      makeRequirements(Array.from({ length: 9 }, (_, i) => `| R-0${i+1} | r | DONE | |\n`).join('') + `| R-10 | r | DONE | |\n`)
    );
    writeFile('requirements/risks/risks.md', makeRisks('| R001 | a | MITIGATED | LOW |\n'));
    writeFile('docs/adr/0001-test.md', makeAdr('accepted'));
    writeDir(`sprint-log/${dateOffset(-1)}_fresh`);
    writeFile('package.json', JSON.stringify({ scripts: { test: 'vitest run' } }));

    const code = await runHealth({ cwd: tmpDir, quiet: true });
    expect(code).toBe(0);
  });

  it('exit 2 (RED) when ≥4 OPEN risks', async () => {
    writeFile('requirements/risks/risks.md',
      makeRisks(
        `| R1 | a | OPEN | H |\n| R2 | b | OPEN | H |\n| R3 | c | OPEN | M |\n| R4 | d | OPEN | L |\n`
      )
    );
    const code = await runHealth({ cwd: tmpDir, quiet: true });
    expect(code).toBe(2);
  });

  it('prints only one line with --quiet', async () => {
    const lines = await captureLines(() =>
      runHealth({ cwd: tmpDir, quiet: true })
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^Overall: (GREEN|AMBER|RED)$/);
  });
});

// ── Test: --check <category> ─────────────────────────────────────────────────

describe('--check <category>', () => {
  it('only runs requirements check', async () => {
    writeFile(
      'requirements/REQUIREMENTS.md',
      makeRequirements(`| R-01 | a | DONE | |\n`)
    );

    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'requirements' })
    );
    expect(json.categories).toHaveProperty('requirements');
    expect(Object.keys(json.categories)).toHaveLength(1);
  });

  it('returns error exit code for unknown category', async () => {
    const code = await runHealth({ cwd: tmpDir, check: 'invalid-cat' });
    expect(code).toBe(1);
  });

  it('--check risks runs only risks', async () => {
    writeFile('requirements/risks/risks.md', makeRisks('| R1 | a | OPEN | H |\n'));
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'risks' })
    );
    expect(Object.keys(json.categories)).toEqual(['risks']);
    expect(json.categories.risks.openCount).toBe(1);
  });
});

// ── Test: sprint freshness ────────────────────────────────────────────────────

describe('sprint freshness', () => {
  it('3-day-old folder = GREEN', async () => {
    const d = dateOffset(-3);
    writeDir(`sprint-log/${d}_my-sprint`);
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'sprint' })
    );
    expect(json.categories.sprint.status).toBe('green');
    expect(json.categories.sprint.days).toBe(3);
  });

  it('30-day-old folder = RED', async () => {
    const d = dateOffset(-30);
    writeDir(`sprint-log/${d}_old-sprint`);
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'sprint' })
    );
    expect(json.categories.sprint.status).toBe('red');
    expect(json.categories.sprint.days).toBe(30);
  });

  it('8-day-old folder = AMBER', async () => {
    const d = dateOffset(-8);
    writeDir(`sprint-log/${d}_mid-sprint`);
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'sprint' })
    );
    expect(json.categories.sprint.status).toBe('amber');
  });

  it('uses most recent folder when multiple exist', async () => {
    writeDir(`sprint-log/${dateOffset(-30)}_old`);
    writeDir(`sprint-log/${dateOffset(-2)}_recent`);
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'sprint' })
    );
    expect(json.categories.sprint.status).toBe('green');
    expect(json.categories.sprint.days).toBe(2);
  });

  it('missing sprint-log/ = AMBER (not RED)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'sprint' })
    );
    expect(json.categories.sprint.status).toBe('amber');
  });
});

// ── Test: ADR status ──────────────────────────────────────────────────────────

describe('ADR status', () => {
  it('all accepted = GREEN', async () => {
    writeFile('docs/adr/0001-a.md', makeAdr('accepted'));
    writeFile('docs/adr/0002-b.md', makeAdr('accepted', '0002', 'b'));
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'adrs' })
    );
    expect(json.categories.adrs.status).toBe('green');
  });

  it('one proposed = AMBER', async () => {
    writeFile('docs/adr/0001-a.md', makeAdr('accepted'));
    writeFile('docs/adr/0002-b.md', makeAdr('proposed', '0002', 'b'));
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'adrs' })
    );
    expect(json.categories.adrs.status).toBe('amber');
  });

  it('one deprecated without supersession = RED', async () => {
    writeFile('docs/adr/0001-a.md', makeAdr('deprecated'));
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'adrs' })
    );
    expect(json.categories.adrs.status).toBe('red');
  });

  it('deprecated + superseded present = GREEN (resolved)', async () => {
    writeFile('docs/adr/0001-a.md', makeAdr('deprecated'));
    writeFile('docs/adr/0002-b.md', makeAdr('superseded', '0002', 'b'));
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'adrs' })
    );
    // superseded present means the deprecated one was replaced — green
    expect(json.categories.adrs.status).toBe('green');
  });

  it('no docs/adr/ = AMBER (missing != broken)', async () => {
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'adrs' })
    );
    expect(json.categories.adrs.status).toBe('amber');
  });
});

// ── Test: status case-insensitivity ──────────────────────────────────────────

describe('status case-insensitivity', () => {
  it('DONE, done, Done all count as DONE in requirements', async () => {
    writeFile(
      'requirements/REQUIREMENTS.md',
      makeRequirements(
        `| R-01 | a | DONE | |\n` +
        `| R-02 | b | done | |\n` +
        `| R-03 | c | Done | |\n`
      )
    );
    const json = await captureJson(() =>
      runHealth({ cwd: tmpDir, json: true, check: 'requirements' })
    );
    expect(json.categories.requirements.done).toBe(3);
    expect(json.categories.requirements.total).toBe(3);
    expect(json.categories.requirements.pct).toBe(100);
  });
});

// ── Test: full table print (smoke) ────────────────────────────────────────────

describe('full table print', () => {
  it('prints header, separator, and Overall line', async () => {
    const lines = await captureLines(() =>
      runHealth({ cwd: tmpDir })
    );
    expect(lines[0]).toMatch(/^leafnux health —/);
    expect(lines[1]).toMatch(/^═+$/);
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toMatch(/^Overall: (GREEN|AMBER|RED)/);
  });
});
