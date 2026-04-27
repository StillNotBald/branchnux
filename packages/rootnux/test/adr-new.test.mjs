// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/adr-new.test.mjs
 *
 * Tests for `rootnux adr-new <title>`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runAdrNew } from '../src/commands/adr-new.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-adr-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rootnux adr-new', () => {
  it('creates first ADR as 0001-*.md when no existing ADRs', async () => {
    const code = await runAdrNew('Use PostgreSQL', { cwd: tmpDir });
    expect(code).toBe(0);

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    const files = fs.readdirSync(adrDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^0001-/);
  });

  it('generates kebab-case slug from title', async () => {
    const code = await runAdrNew('Use PostgreSQL for Storage', { cwd: tmpDir });
    expect(code).toBe(0);

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    const files = fs.readdirSync(adrDir);
    expect(files[0]).toBe('0001-use-postgresql-for-storage.md');
  });

  it('increments from existing highest ADR number', async () => {
    // Pre-create two ADRs
    const adrDir = path.join(tmpDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });
    fs.writeFileSync(path.join(adrDir, '0001-first.md'), '# ADR-0001', 'utf-8');
    fs.writeFileSync(path.join(adrDir, '0003-third.md'), '# ADR-0003', 'utf-8');

    const code = await runAdrNew('Fourth Decision', { cwd: tmpDir });
    expect(code).toBe(0);

    const files = fs.readdirSync(adrDir).sort();
    const newFile = files.find(f => f.startsWith('0004'));
    expect(newFile).toBeDefined();
    expect(newFile).toBe('0004-fourth-decision.md');
  });

  it('includes correct YAML frontmatter', async () => {
    await runAdrNew('Adopt Event Sourcing', { cwd: tmpDir });

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    const files = fs.readdirSync(adrDir);
    const content = fs.readFileSync(path.join(adrDir, files[0]), 'utf-8');

    expect(content).toContain('adr: 0001');
    expect(content).toContain('title: Adopt Event Sourcing');
    expect(content).toContain('status: proposed');
    expect(content).toMatch(/date: \d{4}-\d{2}-\d{2}/);
  });

  it('includes all required markdown sections', async () => {
    await runAdrNew('My Decision', { cwd: tmpDir });

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    const files = fs.readdirSync(adrDir);
    const content = fs.readFileSync(path.join(adrDir, files[0]), 'utf-8');

    expect(content).toContain('## Status');
    expect(content).toContain('## Context');
    expect(content).toContain('## Decision');
    expect(content).toContain('## Consequences');
    expect(content).toContain('# ADR-0001: My Decision');
  });

  it('returns exit 1 for empty title', async () => {
    const code = await runAdrNew('', { cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('returns exit 1 for whitespace-only title', async () => {
    const code = await runAdrNew('   ', { cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('strips special characters from slug', async () => {
    const code = await runAdrNew('Use React (v18) & Vite!', { cwd: tmpDir });
    expect(code).toBe(0);

    const adrDir = path.join(tmpDir, 'docs', 'adr');
    const files = fs.readdirSync(adrDir);
    // Should only have alphanumerics and hyphens
    expect(files[0]).toMatch(/^0001-[a-z0-9-]+\.md$/);
  });
});

// ── Fix 8: empty slug guard ───────────────────────────────────────────────────

describe('rootnux adr-new — empty slug guard (Fix 8)', () => {
  let tmpDir2;

  beforeEach(() => {
    tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-adr-slug-'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir2, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns exit 1 for title with only special chars (!!!)', async () => {
    const code = await runAdrNew('!!!', { cwd: tmpDir2 });
    expect(code).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('no alphanumeric characters')
    );
  });

  it('returns exit 1 for title composed entirely of punctuation', async () => {
    const code = await runAdrNew('--- ### %%%', { cwd: tmpDir2 });
    expect(code).toBe(1);
  });

  it('does not create any file when slug is empty', async () => {
    const adrDir = path.join(tmpDir2, 'docs', 'adr');
    await runAdrNew('!!!', { cwd: tmpDir2 });
    const files = fs.existsSync(adrDir) ? fs.readdirSync(adrDir) : [];
    expect(files).toHaveLength(0);
  });
});

// ── Fix 3: path traversal defense ────────────────────────────────────────────

describe('rootnux adr-new — path traversal guard (Fix 3)', () => {
  let tmpDir3;

  beforeEach(() => {
    tmpDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-adr-trav-'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir3, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('refuses to write when path.resolve would escape adrDir (mock test)', async () => {
    // Spy on path.resolve so that for the ADR file path it returns something outside adrDir
    const origResolve = path.resolve.bind(path);
    let callCount = 0;
    vi.spyOn(path, 'resolve').mockImplementation((...args) => {
      callCount++;
      const real = origResolve(...args);
      // On the second resolve call (the file path), return something outside adrDir
      if (callCount === 2) {
        return origResolve(tmpDir3, '..', 'escaped.md');
      }
      return real;
    });

    const code = await runAdrNew('My Decision', { cwd: tmpDir3 });
    expect(code).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('refusing to write outside docs/adr/')
    );
  });
});

// ── Fix 4: ADR numbering race ─────────────────────────────────────────────────

describe('rootnux adr-new — exclusive create prevents race overwrite (Fix 4)', () => {
  let tmpDir4;

  beforeEach(() => {
    tmpDir4 = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-adr-race-'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir4, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('second call with same computed number returns exit 1, not silent overwrite', async () => {
    // First call succeeds
    const code1 = await runAdrNew('First Title', { cwd: tmpDir4 });
    expect(code1).toBe(0);

    const adrDir = path.join(tmpDir4, 'docs', 'adr');
    const firstContent = fs.readFileSync(
      path.join(adrDir, fs.readdirSync(adrDir)[0]),
      'utf-8'
    );

    // Manually rename so that the next call also picks number 0001
    const files = fs.readdirSync(adrDir);
    // Replace the numbering so a second "0001" is possible by pre-seeding a
    // different slug with number 0001 after we delete the original.
    // Simpler: create a new temp workspace and pre-plant a file, then call with
    // same number via mocked readdirSync.
    const origOpenSync = fs.openSync.bind(fs);
    vi.spyOn(fs, 'openSync').mockImplementationOnce((p, flag) => {
      if (flag === 'wx') {
        const err = Object.assign(new Error('EEXIST: file already exists'), { code: 'EEXIST' });
        throw err;
      }
      return origOpenSync(p, flag);
    });

    const code2 = await runAdrNew('Second Title', { cwd: tmpDir4 });
    expect(code2).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));

    // Original file content must be unchanged
    const afterContent = fs.readFileSync(
      path.join(adrDir, fs.readdirSync(adrDir)[0]),
      'utf-8'
    );
    expect(afterContent).toBe(firstContent);
  });
});
