// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/kb-init.test.mjs
 *
 * Tests for `rootnux kb-init`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runKbInit } from '../src/commands/kb-init.mjs';

const KB_REL = 'docs/KNOWLEDGE_BASE.md';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-kb-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('rootnux kb-init — happy path', () => {
  it('creates docs/KNOWLEDGE_BASE.md and returns exit 0', async () => {
    const code = await runKbInit({ cwd: tmpDir });
    expect(code).toBe(0);

    const absPath = path.join(tmpDir, KB_REL);
    expect(fs.existsSync(absPath)).toBe(true);
  });

  it('prints Created: docs/KNOWLEDGE_BASE.md on stdout', async () => {
    const logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await runKbInit({ cwd: tmpDir });

    expect(logs.some(l => l.includes('Created: docs/KNOWLEDGE_BASE.md'))).toBe(true);
    vi.restoreAllMocks();
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('rootnux kb-init — idempotent', () => {
  it('second run skips and returns exit 0', async () => {
    await runKbInit({ cwd: tmpDir });

    const code = await runKbInit({ cwd: tmpDir });
    expect(code).toBe(0);
  });

  it('second run prints Skipped message', async () => {
    await runKbInit({ cwd: tmpDir });

    const logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await runKbInit({ cwd: tmpDir });

    expect(logs.some(l => l.includes('Skipped') && l.includes('docs/KNOWLEDGE_BASE.md'))).toBe(true);
    vi.restoreAllMocks();
  });

  it('second run does NOT overwrite content of existing file', async () => {
    await runKbInit({ cwd: tmpDir });

    const absPath = path.join(tmpDir, KB_REL);
    const original = fs.readFileSync(absPath, 'utf-8');

    // Append sentinel so we can detect an overwrite
    fs.appendFileSync(absPath, '\n<!-- sentinel -->');
    const modified = fs.readFileSync(absPath, 'utf-8');

    await runKbInit({ cwd: tmpDir });

    const after = fs.readFileSync(absPath, 'utf-8');
    expect(after).toBe(modified); // unchanged — sentinel still present
  });
});

// ── Section headings ──────────────────────────────────────────────────────────

describe('rootnux kb-init — required section headings', () => {
  it('contains all nine required sections', async () => {
    await runKbInit({ cwd: tmpDir });

    const content = fs.readFileSync(path.join(tmpDir, KB_REL), 'utf-8');

    expect(content).toContain('## Project objective');
    expect(content).toContain('## Business owner');
    expect(content).toContain('## Stakeholders');
    expect(content).toContain('## Team resources');
    expect(content).toContain('## Lessons learned');
    expect(content).toContain('## Audit prep contacts');
    expect(content).toContain('## Compliance + regulatory mapping');
    expect(content).toContain('## Vendor / sub-processor list');
    expect(content).toContain('## Disaster recovery + business continuity');
  });
});

// ── Frontmatter ───────────────────────────────────────────────────────────────

describe('rootnux kb-init — frontmatter', () => {
  it('frontmatter contains schema: kb-v1', async () => {
    await runKbInit({ cwd: tmpDir });

    const content = fs.readFileSync(path.join(tmpDir, KB_REL), 'utf-8');
    expect(content).toContain('schema: kb-v1');
  });

  it('frontmatter is wrapped in --- delimiters', async () => {
    await runKbInit({ cwd: tmpDir });

    const content = fs.readFileSync(path.join(tmpDir, KB_REL), 'utf-8');
    // File must start with ---
    expect(content.startsWith('---')).toBe(true);
    // And have a closing ---
    const lines = content.split('\n');
    const closingIdx = lines.slice(1).findIndex(l => l.trim() === '---');
    expect(closingIdx).toBeGreaterThan(-1);
  });
});

// ── --force flag ──────────────────────────────────────────────────────────────

describe('rootnux kb-init --force', () => {
  it('--force exits 1 if file already exists', async () => {
    // First create the file normally
    await runKbInit({ cwd: tmpDir });

    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));

    const code = await runKbInit({ cwd: tmpDir, force: true });

    expect(code).toBe(1);
    vi.restoreAllMocks();
  });

  it('--force prints "Refusing to overwrite" message', async () => {
    await runKbInit({ cwd: tmpDir });

    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));

    await runKbInit({ cwd: tmpDir, force: true });

    expect(errors.some(e => e.includes('Refusing to overwrite'))).toBe(true);
    vi.restoreAllMocks();
  });

  it('--force succeeds (exit 0) if file does NOT yet exist', async () => {
    const code = await runKbInit({ cwd: tmpDir, force: true });
    expect(code).toBe(0);

    const absPath = path.join(tmpDir, KB_REL);
    expect(fs.existsSync(absPath)).toBe(true);
  });

  it('--force does not modify an existing file when it refuses', async () => {
    await runKbInit({ cwd: tmpDir });
    const absPath = path.join(tmpDir, KB_REL);
    const original = fs.readFileSync(absPath, 'utf-8');

    vi.spyOn(console, 'error').mockImplementation(() => {});
    await runKbInit({ cwd: tmpDir, force: true });
    vi.restoreAllMocks();

    const after = fs.readFileSync(absPath, 'utf-8');
    expect(after).toBe(original);
  });
});

// ── Symlink defense ───────────────────────────────────────────────────────────

describe('rootnux kb-init — symlink defense', () => {
  it('treats a symlink at docs/KNOWLEDGE_BASE.md as "exists" and skips', async () => {
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    // Create a real target file in tmpdir
    const targetPath = path.join(tmpDir, 'symlink-target.md');
    fs.writeFileSync(targetPath, '# existing target', 'utf-8');

    const linkPath = path.join(docsDir, 'KNOWLEDGE_BASE.md');

    let symlinkCreated = false;
    try {
      fs.symlinkSync(targetPath, linkPath);
      symlinkCreated = true;
    } catch {
      // Symlink creation may fail on Windows without elevated privileges — skip
    }

    if (!symlinkCreated) {
      // Skip gracefully on Windows if symlinks are unavailable
      return;
    }

    const targetBefore = fs.readFileSync(targetPath, 'utf-8');

    const code = await runKbInit({ cwd: tmpDir });
    expect(code).toBe(0); // skip, not error

    // Target file must be untouched
    const targetAfter = fs.readFileSync(targetPath, 'utf-8');
    expect(targetAfter).toBe(targetBefore);
  });
});
