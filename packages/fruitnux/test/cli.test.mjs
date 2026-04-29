// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * test/cli.test.mjs
 *
 * CLI smoke + integration tests for fruitnux.
 *
 * Runs the real CLI binary via node:child_process execFileSync so every test
 * exercises the full command dispatch path including Commander registration,
 * option parsing, and process.exit codes.
 *
 * These verbs were promoted from branchnux in v0.6 (AP-F7).
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Helpers ──────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, '..', 'bin', 'fruitnux.mjs');
const NODE = process.execPath;

/**
 * Run the fruitnux CLI synchronously.
 * Returns { stdout, stderr, status } — never throws.
 */
function run(args, opts = {}) {
  const { cwd = os.tmpdir(), env = process.env, timeout = 15_000 } = opts;
  try {
    const stdout = execFileSync(NODE, [BIN, ...args], {
      cwd,
      env,
      timeout,
      encoding: 'utf-8',
    });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      status: err.status ?? 1,
    };
  }
}

/** Create a temp sandbox dir, return its path. */
function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fn-test-'));
}

/** Recursively remove a directory. */
function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── 1. Help + Version ─────────────────────────────────────────────────────────

describe('fruitnux: help + version', () => {
  it('--version exits 0 and outputs a semver string', () => {
    const { stdout, status } = run(['--version']);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help exits 0 and lists all fruitnux verbs', () => {
    const { stdout, status } = run(['--help']);
    expect(status).toBe(0);
    // All top-level fruitnux commands must appear
    const commands = ['rtm', 'sca', 'br', 'sign'];
    for (const cmd of commands) {
      expect(stdout).toContain(cmd);
    }
  });

  it('sca --help exits 0 and lists sca subcommands', () => {
    const { stdout, status } = run(['sca', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('init');
    expect(stdout).toContain('generate');
    expect(stdout).toContain('pdf');
    expect(stdout).toContain('oscal');
  });

  it('br --help exits 0 and lists br subcommands', () => {
    const { stdout, status } = run(['br', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('init');
    expect(stdout).toContain('link');
    expect(stdout).toContain('rtm');
  });

  it('sign --help exits 0 and lists sign options', () => {
    const { stdout, status } = run(['sign', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--verify');
    expect(stdout).toContain('--reject');
  });

  it('unknown command exits non-zero', () => {
    const { status } = run(['foobar-not-a-command']);
    expect(status).not.toBe(0);
  });
});

// ── 2. rtm smoke ─────────────────────────────────────────────────────────────

describe('fruitnux: rtm', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => rimraf(tmp));

  it('exits non-zero when REQUIREMENTS.md is missing', () => {
    const { status, stderr } = run(['rtm', '--dry-run'], { cwd: tmp });
    expect(status).not.toBe(0);
    expect(stderr + '').toMatch(/requirements|REQUIREMENTS|not found/i);
  });

  it('rtm --help exits 0 and lists rtm flags', () => {
    const { stdout, status } = run(['rtm', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--dry-run');
    expect(stdout).toContain('--strict');
  });
});

// ── 3. sca smoke ─────────────────────────────────────────────────────────────

describe('fruitnux: sca', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => rimraf(tmp));

  it('sca init --dry-run exits 0 and prints SCA template to stdout (no REQUIREMENTS.md needed)', () => {
    const { status, stdout } = run(['sca', 'init', 'test-surface', '--dry-run'], { cwd: tmp });
    // sca init scaffolds a template — it does not require REQUIREMENTS.md
    expect(status).toBe(0);
    expect(stdout).toContain('Security Control Assessment');
  });

  it('sca init --help exits 0 and lists sca init flags', () => {
    const { stdout, status } = run(['sca', 'init', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--industry');
    expect(stdout).toContain('--dry-run');
  });

  it('sca generate --help exits 0', () => {
    const { stdout, status } = run(['sca', 'generate', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--dry-run');
  });

  it('sca oscal --help exits 0 and lists oscal flags', () => {
    const { stdout, status } = run(['sca', 'oscal', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--validate');
    expect(stdout).toContain('--dry-run');
  });
});

// ── 4. br smoke ───────────────────────────────────────────────────────────────

describe('fruitnux: br', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => rimraf(tmp));

  it('br init creates BUSINESS_REQUIREMENTS.md for a valid BR-ID', () => {
    const { status } = run(['br', 'init', 'BR-01', '--out', tmp], { cwd: tmp });
    expect(status).toBe(0);
    expect(fs.existsSync(path.join(tmp, 'requirements', 'BUSINESS_REQUIREMENTS.md'))).toBe(true);
  });

  it('br init is idempotent — running twice does not error', () => {
    const first = run(['br', 'init', 'BR-01', '--out', tmp], { cwd: tmp });
    const second = run(['br', 'init', 'BR-01', '--out', tmp], { cwd: tmp });
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
  });

  it('br link updates BUSINESS_REQUIREMENTS.md with R-ID mappings', () => {
    run(['br', 'init', 'BR-01', '--out', tmp], { cwd: tmp });
    const { status } = run(['br', 'link', 'BR-01', 'R-01,R-02', '--out', tmp], { cwd: tmp });
    expect(status).toBe(0);
    const content = fs.readFileSync(path.join(tmp, 'requirements', 'BUSINESS_REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('R-01');
    expect(content).toContain('R-02');
  });

  it('br rtm --help exits 0', () => {
    const { stdout, status } = run(['br', 'rtm', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--out');
  });
});

// ── 5. sign smoke ─────────────────────────────────────────────────────────────

describe('fruitnux: sign', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => rimraf(tmp));

  it('sign pdf --help exits 0 and lists sign-pdf flags', () => {
    const { stdout, status } = run(['sign', 'pdf', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--folder');
    expect(stdout).toContain('--output');
  });

  it('sign stale-check --help exits 0 and lists threshold flag', () => {
    const { stdout, status } = run(['sign', 'stale-check', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--threshold');
    expect(stdout).toContain('--strict');
  });
});
