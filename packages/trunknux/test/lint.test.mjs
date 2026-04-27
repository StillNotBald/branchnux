import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { lint } from '../src/commands/lint.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trunknux-lint-'));
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw Object.assign(new Error(`process.exit(${code})`), { exitCode: code });
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function run(opts = {}) {
  return lint({ cwd: tmpDir, ...opts });
}

function makeSprintFolder(name, readme = true, frontmatter = true) {
  const dir = path.join(tmpDir, 'sprint-log', name);
  fs.mkdirSync(dir, { recursive: true });
  if (readme) {
    const slug = name.replace(/^\d{4}-\d{2}-\d{2}_/, '');
    const date = name.slice(0, 10);
    const fm = frontmatter
      ? `---\nsprint: ${slug}\ndate: ${date}\nstatus: in-progress\n---\n`
      : '';
    fs.writeFileSync(path.join(dir, 'README.md'), `${fm}# Sprint: ${slug}\n`, 'utf8');
  }
  return dir;
}

describe('lint: no sprint-log directory', () => {
  it('exits 2 with helpful message', () => {
    expect(() => run()).toThrow(/process\.exit\(2\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('No sprint-log directory found')
    );
  });

  it('outputs JSON with error when --json', () => {
    let output;
    vi.spyOn(console, 'log').mockImplementation((s) => { output = s; });
    expect(() => run({ json: true })).toThrow(/process\.exit\(2\)/);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(false);
  });
});

describe('lint: clean case', () => {
  it('exits 0 when all folders are valid', () => {
    makeSprintFolder('2026-04-27_my-sprint');
    makeSprintFolder('2026-04-28_another-sprint');
    expect(() => run()).toThrow(/process\.exit\(0\)/);
  });

  it('prints OK summary', () => {
    makeSprintFolder('2026-04-27_clean-sprint');
    expect(() => run()).toThrow(/process\.exit\(0\)/);
    const calls = (console.log).mock.calls.flat().join(' ');
    expect(calls).toMatch(/OK/);
  });

  it('--json output is ok:true with no errors', () => {
    makeSprintFolder('2026-04-27_json-clean');
    let output;
    vi.spyOn(console, 'log').mockImplementation((s) => { output = s; });
    expect(() => run({ json: true })).toThrow(/process\.exit\(0\)/);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.errors).toHaveLength(0);
  });
});

describe('lint: invalid folder names', () => {
  it('errors on folder with no date prefix', () => {
    fs.mkdirSync(path.join(tmpDir, 'sprint-log', 'no-date-prefix'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sprint-log', 'no-date-prefix', 'README.md'), '# x\n');
    expect(() => run()).toThrow(/process\.exit\(1\)/);
    const calls = (console.error).mock.calls.flat().join(' ');
    expect(calls).toMatch(/invalid-folder-name|does not match/i);
  });

  it('errors on folder with invalid date (month 13)', () => {
    fs.mkdirSync(path.join(tmpDir, 'sprint-log', '2026-13-01_bad-date'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sprint-log', '2026-13-01_bad-date', 'README.md'), '# x\n');
    expect(() => run()).toThrow(/process\.exit\(1\)/);
  });

  it('errors on folder with non-kebab slug (underscore)', () => {
    fs.mkdirSync(path.join(tmpDir, 'sprint-log', '2026-04-27_bad_slug'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sprint-log', '2026-04-27_bad_slug', 'README.md'), '# x\n');
    expect(() => run()).toThrow(/process\.exit\(1\)/);
    const calls = (console.error).mock.calls.flat().join(' ');
    expect(calls).toMatch(/invalid-slug|invalid slug/i);
  });
});

describe('lint: missing README', () => {
  it('errors when README.md is absent', () => {
    makeSprintFolder('2026-04-27_no-readme', false);
    expect(() => run()).toThrow(/process\.exit\(1\)/);
    const calls = (console.error).mock.calls.flat().join(' ');
    expect(calls).toMatch(/missing.*README|README.*missing/i);
  });
});

describe('lint: missing frontmatter', () => {
  it('warns when frontmatter is absent but does not error', () => {
    makeSprintFolder('2026-04-27_no-fm', true, false);
    expect(() => run()).toThrow(/process\.exit\(0\)/);
    const warnCalls = (console.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toMatch(/frontmatter|WARN/i);
  });

  it('warns about missing sprint: key in frontmatter', () => {
    const dir = path.join(tmpDir, 'sprint-log', '2026-04-27_partial-fm');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'README.md'),
      '---\ndate: 2026-04-27\n---\n# Sprint\n',
      'utf8'
    );
    expect(() => run()).toThrow(/process\.exit\(0\)/);
    const warnCalls = (console.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toMatch(/sprint/i);
  });
});

describe('lint: empty sprint-log', () => {
  it('exits 0 with empty message when sprint-log exists but has no subdirs', () => {
    fs.mkdirSync(path.join(tmpDir, 'sprint-log'), { recursive: true });
    expect(() => run()).toThrow(/process\.exit\(0\)/);
  });
});
