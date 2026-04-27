import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { newSprint } from '../src/commands/new-sprint.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trunknux-new-sprint-'));
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw Object.assign(new Error(`process.exit(${code})`), { exitCode: code });
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function run(slug, opts = {}) {
  return newSprint(slug, { cwd: tmpDir, ...opts });
}

describe('new-sprint: happy path', () => {
  it('creates sprint-log/<date>_<slug>/ folder', () => {
    expect(() => run('my-sprint')).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const entries = fs.readdirSync(sprintLog);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^\d{4}-\d{2}-\d{2}_my-sprint$/);
  });

  it('creates README.md inside the sprint folder', () => {
    expect(() => run('alpha-build')).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const readmePath = path.join(sprintLog, folder, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain('sprint: alpha-build');
    expect(content).toContain('# Sprint: Alpha Build');
    expect(content).toContain('status: in-progress');
  });

  it('prints the folder and README paths', () => {
    expect(() => run('log-test')).toThrow(/process\.exit\(0\)/);
    expect(console.log).toHaveBeenCalledTimes(2);
  });
});

describe('new-sprint: --no-readme flag', () => {
  it('creates folder but no README.md', () => {
    expect(() => run('no-readme-slug', { readme: false })).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const readmePath = path.join(sprintLog, folder, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(false);
  });

  it('prints only the folder path (one line)', () => {
    expect(() => run('no-readme-slug', { readme: false })).toThrow(/process\.exit\(0\)/);
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});

describe('new-sprint: slug validation', () => {
  const badSlugs = [
    'My Sprint',
    'my_sprint',
    '-leading',
    'trailing-',
    'UPPER',
    '',
    'has spaces',
  ];

  for (const slug of badSlugs) {
    it(`rejects invalid slug "${slug || '(empty)'}"`, () => {
      expect(() => run(slug)).toThrow(/process\.exit\(1\)/);
    });
  }

  const goodSlugs = ['my-sprint', 'sprint1', 'a', 'v0-4-1'];
  for (const slug of goodSlugs) {
    it(`accepts valid slug "${slug}"`, () => {
      expect(() => run(slug)).toThrow(/process\.exit\(0\)/);
    });
  }
});

describe('new-sprint: idempotency', () => {
  it('does not overwrite an existing sprint folder or README', () => {
    expect(() => run('idempotent-slug')).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const readmePath = path.join(sprintLog, folder, 'README.md');

    // Mutate README
    fs.writeFileSync(readmePath, '# Modified', 'utf8');

    // Run again — should be idempotent
    expect(() => run('idempotent-slug')).toThrow(/process\.exit\(0\)/);

    const after = fs.readFileSync(readmePath, 'utf8');
    expect(after).toBe('# Modified');
  });

  it('prints "Sprint folder already exists" message', () => {
    expect(() => run('exists-slug')).toThrow(/process\.exit\(0\)/);
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => run('exists-slug')).toThrow(/process\.exit\(0\)/);
    const calls = (console.log).mock.calls.flat().join(' ');
    expect(calls).toMatch(/Sprint folder already exists/);
  });
});

// ── Fix 9: error handling for write failures (trunknux new-sprint) ────────────

describe('new-sprint: write-failure error path (Fix 9)', () => {
  it('exits 1 and prints path-aware message when writeFileSync throws EPERM', () => {
    const origWriteFile = fs.writeFileSync.bind(fs);
    vi.spyOn(fs, 'writeFileSync').mockImplementationOnce((p, data, enc) => {
      const err = Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
      throw err;
    });

    expect(() => run('eperm-test')).toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('README'));
  });
});
