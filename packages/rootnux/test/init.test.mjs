// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/init.test.mjs
 *
 * Tests for `rootnux init`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInit } from '../src/commands/init.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-init-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('rootnux init', () => {
  it('creates REQUIREMENTS.md with rxx-v1 frontmatter', async () => {
    await runInit({ cwd: tmpDir });

    const reqPath = path.join(tmpDir, 'requirements', 'REQUIREMENTS.md');
    expect(fs.existsSync(reqPath)).toBe(true);

    const content = fs.readFileSync(reqPath, 'utf-8');
    expect(content).toContain('schema: rxx-v1');
    expect(content).toContain('| # | Requirement | Status | Notes |');
    expect(content).toContain('R-01');
  });

  it('creates TRACEABILITY.md with rtm-v1 frontmatter', async () => {
    await runInit({ cwd: tmpDir });

    const tracePath = path.join(tmpDir, 'requirements', 'TRACEABILITY.md');
    expect(fs.existsSync(tracePath)).toBe(true);

    const content = fs.readFileSync(tracePath, 'utf-8');
    expect(content).toContain('schema: rtm-v1');
    expect(content).toContain('R-XX | Sprint | Code File(s)');
  });

  it('creates risks/risks.md', async () => {
    await runInit({ cwd: tmpDir });

    const risksPath = path.join(tmpDir, 'requirements', 'risks', 'risks.md');
    expect(fs.existsSync(risksPath)).toBe(true);

    const content = fs.readFileSync(risksPath, 'utf-8');
    expect(content).toContain('Risk ID | Domain | Risk | Severity | Status');
  });

  it('creates docs/adr/ directory', async () => {
    await runInit({ cwd: tmpDir });

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    expect(fs.existsSync(adrDir)).toBe(true);
    expect(fs.statSync(adrDir).isDirectory()).toBe(true);
  });

  it('is idempotent — second run skips existing files', async () => {
    await runInit({ cwd: tmpDir });

    // Modify a file to verify it is NOT overwritten on second run
    const reqPath = path.join(tmpDir, 'requirements', 'REQUIREMENTS.md');
    const originalContent = fs.readFileSync(reqPath, 'utf-8');
    const marker = '\n<!-- HAND-EDITED -->';
    fs.writeFileSync(reqPath, originalContent + marker, 'utf-8');

    // Second run — should not overwrite
    await runInit({ cwd: tmpDir });

    const afterContent = fs.readFileSync(reqPath, 'utf-8');
    expect(afterContent).toContain(marker);
  });

  it('exits without throwing even when all files already exist', async () => {
    await runInit({ cwd: tmpDir });
    // Should not throw
    await expect(runInit({ cwd: tmpDir })).resolves.not.toThrow();
  });
});

// ── Fix 2: TOCTOU / symlink tests ─────────────────────────────────────────────

describe('rootnux init — symlink safety (Fix 2)', () => {
  let tmpDir2;

  beforeEach(() => {
    tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-init-sym-'));
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw Object.assign(new Error(`process.exit(${code})`), { exitCode: code });
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir2, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('treats a pre-existing symlink at REQUIREMENTS.md as "exists" (skips, does not write through)', async () => {
    // Create the parent dir and a decoy target
    const reqDir = path.join(tmpDir2, 'requirements');
    fs.mkdirSync(reqDir, { recursive: true });
    const decoyPath = path.join(tmpDir2, 'decoy.txt');
    fs.writeFileSync(decoyPath, 'original', 'utf-8');

    const symlinkPath = path.join(reqDir, 'REQUIREMENTS.md');
    try {
      fs.symlinkSync(decoyPath, symlinkPath);
    } catch {
      // Symlink creation may require admin on Windows — skip gracefully
      return;
    }

    // init should see EEXIST and skip, not write through the symlink
    await runInit({ cwd: tmpDir2 });

    // The decoy must not have been overwritten
    const decoyContent = fs.readFileSync(decoyPath, 'utf-8');
    expect(decoyContent).toBe('original');
  });
});

// ── Fix 9: error handling for write failures (rootnux init) ───────────────────

describe('rootnux init — write-failure error path (Fix 9)', () => {
  let tmpDir3;

  beforeEach(() => {
    tmpDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-init-err-'));
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw Object.assign(new Error(`process.exit(${code})`), { exitCode: code });
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir3, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('calls process.exit(1) and prints path when openSync throws EPERM', async () => {
    const origOpenSync = fs.openSync.bind(fs);
    vi.spyOn(fs, 'openSync').mockImplementation((p, flag, ...rest) => {
      if (flag === 'wx' && String(p).includes('REQUIREMENTS.md')) {
        const err = Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
        throw err;
      }
      return origOpenSync(p, flag, ...rest);
    });

    await expect(runInit({ cwd: tmpDir3 })).rejects.toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('REQUIREMENTS.md'));
  });
});
