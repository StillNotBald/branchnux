// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/status.test.mjs
 *
 * Tests for `rootnux status [--json]`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runStatus } from '../src/commands/status.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-status-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function writeReq(content) {
  const dir = path.join(tmpDir, 'requirements');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'REQUIREMENTS.md'), content, 'utf-8');
}

const SAMPLE_REQUIREMENTS = `---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| R-01 | Auth login | DONE | |
| R-02 | Auth logout | DONE | |
| R-03 | Rate limit | BLOCKED | upstream |
| R-04 | MFA enroll | PARTIAL | |
| R-05 | Audit log | NOT STARTED | |
| R-06 | Export CSV | NOT STARTED | |
| R-07 | Dark mode | DECLINED | out of scope |
`;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rootnux status', () => {
  it('returns exit 2 when REQUIREMENTS.md is missing', async () => {
    const code = await runStatus({ cwd: tmpDir });
    expect(code).toBe(2);
  });

  it('returns exit 0 with valid REQUIREMENTS.md', async () => {
    writeReq(SAMPLE_REQUIREMENTS);
    const code = await runStatus({ cwd: tmpDir });
    expect(code).toBe(0);
  });

  it('emits JSON output with --json flag', async () => {
    writeReq(SAMPLE_REQUIREMENTS);

    const written = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => { written.push(chunk); return true; };

    try {
      await runStatus({ cwd: tmpDir, json: true });
    } finally {
      process.stdout.write = origWrite;
    }

    const output = written.join('');
    const parsed = JSON.parse(output.trim());

    expect(parsed.DONE).toBeDefined();
    expect(parsed.DONE.count).toBe(2);
    expect(parsed.BLOCKED).toBeDefined();
    expect(parsed.BLOCKED.count).toBe(1);
    expect(parsed.total).toBe(7);
  });

  it('JSON output includes percentage', async () => {
    writeReq(SAMPLE_REQUIREMENTS);

    const written = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => { written.push(chunk); return true; };

    try {
      await runStatus({ cwd: tmpDir, json: true });
    } finally {
      process.stdout.write = origWrite;
    }

    const parsed = JSON.parse(written.join('').trim());
    expect(parsed.DONE.pct).toBe(Math.round((2 / 7) * 100));
  });

  it('counts all status categories correctly', async () => {
    writeReq(SAMPLE_REQUIREMENTS);

    const written = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => { written.push(chunk); return true; };

    try {
      await runStatus({ cwd: tmpDir, json: true });
    } finally {
      process.stdout.write = origWrite;
    }

    const parsed = JSON.parse(written.join('').trim());

    expect(parsed.DONE.count).toBe(2);
    expect(parsed.BLOCKED.count).toBe(1);
    expect(parsed.PARTIAL.count).toBe(1);
    expect(parsed['NOT STARTED'].count).toBe(2);
    expect(parsed.DECLINED.count).toBe(1);
    expect(parsed.total).toBe(7);
  });

  it('handles empty requirements file gracefully', async () => {
    writeReq(`---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
`);
    const code = await runStatus({ cwd: tmpDir, json: true });
    expect(code).toBe(0);
  });
});

// ── Fix 7: column-position-independent parsing ────────────────────────────────

describe('rootnux status — column-position-independent parsing (Fix 7)', () => {
  function captureJson(fn) {
    return new Promise((resolve, reject) => {
      const written = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk) => { written.push(chunk); return true; };
      Promise.resolve(fn()).then(() => {
        process.stdout.write = orig;
        try { resolve(JSON.parse(written.join('').trim())); }
        catch (e) { reject(e); }
      }).catch(err => { process.stdout.write = orig; reject(err); });
    });
  }

  it('parses 2-column table | R-01 | DONE |', async () => {
    writeReq(`| R-01 | DONE |\n`);
    const parsed = await captureJson(() => runStatus({ cwd: tmpDir, json: true }));
    expect(parsed.DONE?.count).toBe(1);
    expect(parsed.total).toBe(1);
  });

  it('parses 3-column table with leading index | 1 | R-01 | DONE |', async () => {
    writeReq(`| 1 | R-01 | DONE |\n`);
    const parsed = await captureJson(() => runStatus({ cwd: tmpDir, json: true }));
    expect(parsed.DONE?.count).toBe(1);
  });

  it('parses 4-column table with notes | R-01 | feature | DONE | notes |', async () => {
    writeReq(`| R-01 | feature | DONE | notes |\n`);
    const parsed = await captureJson(() => runStatus({ cwd: tmpDir, json: true }));
    expect(parsed.DONE?.count).toBe(1);
  });

  it('counts lowercase status case-insensitively | R-01 | done |', async () => {
    writeReq(`| R-01 | done |\n`);
    const parsed = await captureJson(() => runStatus({ cwd: tmpDir, json: true }));
    expect(parsed.DONE?.count).toBe(1);
  });

  it('parses R-1 (1-digit) and R-1234 (4-digit) R-XX IDs', async () => {
    writeReq(`| R-1 | DONE |\n| R-1234 | BLOCKED |\n`);
    const parsed = await captureJson(() => runStatus({ cwd: tmpDir, json: true }));
    expect(parsed.DONE?.count).toBe(1);
    expect(parsed.BLOCKED?.count).toBe(1);
    expect(parsed.total).toBe(2);
  });
});
