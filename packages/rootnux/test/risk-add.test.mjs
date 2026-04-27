// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/risk-add.test.mjs
 *
 * Tests for `rootnux risk-add`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInit } from '../src/commands/init.mjs';
import { runRiskAdd } from '../src/commands/risk-add.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-risk-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function risksPath() {
  return path.join(tmpDir, 'requirements', 'risks', 'risks.md');
}

function readRisks() {
  return fs.readFileSync(risksPath(), 'utf-8');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rootnux risk-add', () => {
  it('returns exit 2 if risks.md does not exist', async () => {
    const code = await runRiskAdd({ cwd: tmpDir });
    expect(code).toBe(2);
  });

  it('appends R-01 row to an empty risk register', async () => {
    await runInit({ cwd: tmpDir });
    const code = await runRiskAdd({ cwd: tmpDir });
    expect(code).toBe(0);

    const content = readRisks();
    expect(content).toContain('R-01');
    expect(content).toContain('<DOMAIN>');
    expect(content).toContain('MED');
    expect(content).toContain('OPEN');
  });

  it('auto-increments Risk ID on repeated calls', async () => {
    await runInit({ cwd: tmpDir });

    await runRiskAdd({ cwd: tmpDir }); // R-01
    await runRiskAdd({ cwd: tmpDir }); // R-02
    await runRiskAdd({ cwd: tmpDir }); // R-03

    const content = readRisks();
    expect(content).toContain('R-01');
    expect(content).toContain('R-02');
    expect(content).toContain('R-03');
  });

  it('appends without modifying existing rows', async () => {
    await runInit({ cwd: tmpDir });

    // Manually write a known row
    const rp = risksPath();
    const base = fs.readFileSync(rp, 'utf-8');
    const row1 = '| R-01 | SECURITY | SQL injection | HIGH | OPEN |';
    fs.writeFileSync(rp, base + row1 + '\n', 'utf-8');

    await runRiskAdd({ cwd: tmpDir }); // should write R-02

    const content = readRisks();
    expect(content).toContain(row1);
    expect(content).toContain('R-02');
  });

  it('correctly determines next ID from existing highest', async () => {
    await runInit({ cwd: tmpDir });

    const rp = risksPath();
    const base = fs.readFileSync(rp, 'utf-8');
    // Existing rows have R-05 as highest
    const rows = [
      '| R-02 | LEGAL | Contract breach | LOW | OPEN |',
      '| R-05 | TECH | Data loss | HIGH | MITIGATED |',
    ].join('\n');
    fs.writeFileSync(rp, base + rows + '\n', 'utf-8');

    await runRiskAdd({ cwd: tmpDir }); // should be R-06

    const content = readRisks();
    expect(content).toContain('R-06');
    expect(content).not.toContain('R-03\n');
  });
});
