import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { summarize } from '../src/commands/summarize.mjs';

/** Local-date YYYY-MM-DD (matches what the commands produce) */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let tmpDir;

function gitExec(cmd) {
  execSync(cmd, { cwd: tmpDir, stdio: 'pipe' });
}

function setupGitRepo() {
  gitExec('git init');
  gitExec('git config user.email "test@test.com"');
  gitExec('git config user.name "Tester"');
}

let _fileCounter = 0;
function makeCommit(message) {
  _fileCounter++;
  const f = path.join(tmpDir, `file-${_fileCounter}.txt`);
  fs.writeFileSync(f, message, 'utf8');
  // Use `git commit -F <file>` so shell escaping is bulletproof — Windows
  // cmd.exe handles parens in quoted strings unreliably (real flaky failure
  // on `feat(auth): ...` 2026-04-28).
  const msgFile = path.join(tmpDir, `.commit-msg-${_fileCounter}`);
  fs.writeFileSync(msgFile, message, 'utf8');
  gitExec('git add -A');
  gitExec(`git commit -F "${msgFile}"`);
  fs.unlinkSync(msgFile);
}

function makeSprintFolder(slug, date) {
  const folderName = `${date}_${slug}`;
  const dir = path.join(tmpDir, 'sprint-log', folderName);
  fs.mkdirSync(dir, { recursive: true });
  const readme = `---\nsprint: ${slug}\ndate: ${date}\nstatus: in-progress\n---\n# Sprint: ${slug}\n`;
  fs.writeFileSync(path.join(dir, 'README.md'), readme, 'utf8');
  return dir;
}

beforeEach(() => {
  _fileCounter = 0;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trunknux-summarize-'));
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
  return summarize({ cwd: tmpDir, ...opts });
}

describe('summarize: no sprint-log directory', () => {
  it('exits 2 when sprint-log/ does not exist', () => {
    expect(() => run()).toThrow(/process\.exit\(2\)/);
  });
});

describe('summarize: no sprint folders', () => {
  it('exits 2 when sprint-log/ is empty', () => {
    fs.mkdirSync(path.join(tmpDir, 'sprint-log'), { recursive: true });
    expect(() => run()).toThrow(/process\.exit\(2\)/);
  });
});

describe('summarize: happy path', () => {
  beforeEach(() => {
    setupGitRepo();
  });

  it('generates SPRINT_SUMMARY.md with commit count', () => {
    const today = localToday();
    makeSprintFolder('v1-launch', today);

    makeCommit('feat: add login page');
    makeCommit('fix: correct typo in header');
    makeCommit('docs: update README');

    expect(() => run({ since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const summaryPath = path.join(sprintLog, folder, 'SPRINT_SUMMARY.md');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const content = fs.readFileSync(summaryPath, 'utf8');
    expect(content).toContain('sprint: v1-launch');
    expect(content).toContain('## Features');
    expect(content).toContain('## Fixes');
    expect(content).toContain('## Docs');
    expect(content).toContain('feat: add login page');
    expect(content).toContain('fix: correct typo in header');
  });

  it('groups commits by conventional prefix', () => {
    const today = localToday();
    makeSprintFolder('grouping-test', today);

    makeCommit('feat(auth): implement OAuth');
    makeCommit('chore: bump dependencies');
    makeCommit('test: add unit tests');
    makeCommit('refactor: extract utility function');
    makeCommit('random commit message');

    expect(() => run({ since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const content = fs.readFileSync(path.join(sprintLog, folder, 'SPRINT_SUMMARY.md'), 'utf8');

    expect(content).toContain('## Features');
    expect(content).toContain('## Chores');
    expect(content).toContain('## Tests');
    expect(content).toContain('## Refactors');
    expect(content).toContain('## Other');
    expect(content).not.toContain('## Fixes');
  });

  it('skips empty sections', () => {
    const today = localToday();
    makeSprintFolder('only-feats', today);
    makeCommit('feat: only feature here');

    expect(() => run({ since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const content = fs.readFileSync(path.join(sprintLog, folder, 'SPRINT_SUMMARY.md'), 'utf8');

    expect(content).toContain('## Features');
    expect(content).not.toContain('## Fixes');
    expect(content).not.toContain('## Docs');
    expect(content).not.toContain('## Chores');
  });
});

describe('summarize: --sprint flag', () => {
  beforeEach(() => {
    setupGitRepo();
  });

  it('resolves to the named sprint slug', () => {
    const today = localToday();
    makeSprintFolder('named-sprint', today);
    makeCommit('feat: named sprint feature');

    expect(() => run({ sprint: 'named-sprint', since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);

    const summaryPath = path.join(tmpDir, 'sprint-log', `${today}_named-sprint`, 'SPRINT_SUMMARY.md');
    expect(fs.existsSync(summaryPath)).toBe(true);
    const content = fs.readFileSync(summaryPath, 'utf8');
    expect(content).toContain('sprint: named-sprint');
  });

  it('exits 2 when named sprint not found', () => {
    const today = localToday();
    makeSprintFolder('other-sprint', today);

    expect(() => run({ sprint: 'nonexistent' })).toThrow(/process\.exit\(2\)/);
  });
});

describe('summarize: --force flag', () => {
  beforeEach(() => {
    setupGitRepo();
  });

  it('warns and exits 0 if SPRINT_SUMMARY.md exists and --force not set', () => {
    const today = localToday();
    const dir = makeSprintFolder('force-test', today);
    fs.writeFileSync(path.join(dir, 'SPRINT_SUMMARY.md'), '# existing', 'utf8');

    expect(() => run({ since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);
    expect(console.warn).toHaveBeenCalled();
  });

  it('overwrites with --force', () => {
    const today = localToday();
    const dir = makeSprintFolder('force-overwrite', today);
    fs.writeFileSync(path.join(dir, 'SPRINT_SUMMARY.md'), '# old content', 'utf8');
    makeCommit('feat: overwrite test');

    expect(() => run({ force: true, since: "2020-01-01" })).toThrow(/process\.exit\(0\)/);

    const content = fs.readFileSync(path.join(dir, 'SPRINT_SUMMARY.md'), 'utf8');
    expect(content).not.toBe('# old content');
    expect(content).toContain('sprint: force-overwrite');
  });
});

// ── Fix 1 + Fix 5: command injection + delimiter regression tests ─────────────

describe('summarize: date validation (Fix 1 — injection guard)', () => {
  beforeEach(() => {
    setupGitRepo();
    makeSprintFolder('sec-test', localToday());
  });

  it('exits 2 when --since is a shell injection string, BEFORE spawning git', () => {
    expect(() => run({ since: "'; rm -rf /'" })).toThrow(/process\.exit\(2\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('not a valid YYYY-MM-DD date')
    );
  });

  it('exits 2 when --since has extra characters beyond YYYY-MM-DD', () => {
    expect(() => run({ since: '2024-01-01; echo hack' })).toThrow(/process\.exit\(2\)/);
  });

  it('exits 2 when --until is malformed', () => {
    expect(() => run({ since: '2024-01-01', until: '../../../etc/passwd' })).toThrow(/process\.exit\(2\)/);
  });

  it('accepts a valid YYYY-MM-DD date for --since', () => {
    // Should NOT exit 2 — may exit 0 (generated) or throw for other reasons
    let exitCode;
    try {
      run({ since: '2020-01-01' });
    } catch (err) {
      exitCode = err.exitCode;
    }
    // Should not be exit 2 (validation error)
    expect(exitCode).not.toBe(2);
  });
});

describe('summarize: pipe-in-subject parsing (Fix 1/Fix 5 — \x1f delimiter)', () => {
  beforeEach(() => {
    setupGitRepo();
  });

  it('parses commit subject containing literal | correctly', () => {
    const today = localToday();
    makeSprintFolder('pipe-test', today);

    // Commit with a pipe character in the subject
    makeCommit('feat: support A|B toggles for feature flags');

    expect(() => run({ since: '2020-01-01' })).toThrow(/process\.exit\(0\)/);

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folder = fs.readdirSync(sprintLog)[0];
    const content = fs.readFileSync(path.join(sprintLog, folder, 'SPRINT_SUMMARY.md'), 'utf8');

    // The full subject must appear in the output, not split/corrupted
    expect(content).toContain('feat: support A|B toggles for feature flags');
    // commit_count should be 1 (not 0 or partial)
    expect(content).toContain('commit_count: 1');
  });
});
