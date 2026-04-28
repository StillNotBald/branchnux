import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { log } from '../src/commands/log.mjs';

let tmpDir;

/** Local-date YYYY-MM-DD — matches todayISO() in the command */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Create a sprint folder (and optionally a pre-existing LOG.md) in tmpDir */
function makeSprintFolder(slug, date, logContent = null) {
  const folderName = `${date}_${slug}`;
  const dir = path.join(tmpDir, 'sprint-log', folderName);
  fs.mkdirSync(dir, { recursive: true });
  if (logContent !== null) {
    fs.writeFileSync(path.join(dir, 'LOG.md'), logContent, 'utf8');
  }
  return dir;
}

/** Run log() with the given opts, always injecting cwd and capturing process.exit */
function run(opts = {}) {
  return log({ cwd: tmpDir, ...opts });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trunknux-log-'));
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw Object.assign(new Error(`process.exit(${code})`), { exitCode: code });
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ── Happy path: create LOG.md if absent ────────────────────────────────────────
describe('log: happy path — create LOG.md when absent', () => {
  it('creates LOG.md with scaffold and entry', async () => {
    const today = localToday();
    makeSprintFolder('alpha', today);

    await expect(run({ input: 'First entry text', message: undefined })).rejects.toThrow(
      /process\.exit\(0\)/
    );

    const logPath = path.join(tmpDir, 'sprint-log', `${today}_alpha`, 'LOG.md');
    expect(fs.existsSync(logPath)).toBe(true);
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('sprint: alpha');
    expect(content).toContain('schema: log-v1');
    expect(content).toContain('# Sprint Log: Alpha');
    expect(content).toContain(`## ${today}`);
    expect(content).toContain('First entry text');
  });

  it('prints the log path to stdout', async () => {
    const today = localToday();
    makeSprintFolder('beta', today);

    await expect(run({ input: 'Hello world' })).rejects.toThrow(/process\.exit\(0\)/);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('LOG.md'));
  });
});

// ── Same-day double entry ──────────────────────────────────────────────────────
describe('log: same-day double entry', () => {
  it('appends under the same date heading without a new heading', async () => {
    const today = localToday();
    const existingLog = `---
sprint: gamma
schema: log-v1
---
# Sprint Log: Gamma

## ${today}

First entry.
`;
    makeSprintFolder('gamma', today, existingLog);

    await expect(run({ input: 'Second entry.' })).rejects.toThrow(/process\.exit\(0\)/);

    const logPath = path.join(tmpDir, 'sprint-log', `${today}_gamma`, 'LOG.md');
    const content = fs.readFileSync(logPath, 'utf8');

    // Only one date heading
    const headingMatches = [...content.matchAll(new RegExp(`^## ${today}$`, 'gm'))];
    expect(headingMatches).toHaveLength(1);

    // Both entries present
    expect(content).toContain('First entry.');
    expect(content).toContain('Second entry.');
  });
});

// ── New-day entry ──────────────────────────────────────────────────────────────
describe('log: new-day entry', () => {
  it('adds a new date heading when the date differs from existing entries', async () => {
    const today = localToday();
    const pastDate = '2026-01-01';
    const existingLog = `---
sprint: delta
schema: log-v1
---
# Sprint Log: Delta

## ${pastDate}

Old entry.
`;
    makeSprintFolder('delta', pastDate, existingLog);

    await expect(run({ input: 'New day entry.', sprint: 'delta' })).rejects.toThrow(
      /process\.exit\(0\)/
    );

    const sprintLog = path.join(tmpDir, 'sprint-log');
    const folders = fs.readdirSync(sprintLog);
    const deltaFolder = folders.find((f) => f.endsWith('_delta'));
    const logPath = path.join(sprintLog, deltaFolder, 'LOG.md');
    const content = fs.readFileSync(logPath, 'utf8');

    expect(content).toContain(`## ${pastDate}`);
    expect(content).toContain(`## ${today}`);
    expect(content).toContain('Old entry.');
    expect(content).toContain('New day entry.');
  });
});

// ── --message flag ─────────────────────────────────────────────────────────────
describe('log: --message flag', () => {
  it('uses provided message without reading stdin', async () => {
    const today = localToday();
    makeSprintFolder('msg-test', today);

    await expect(run({ message: 'Via message flag.' })).rejects.toThrow(/process\.exit\(0\)/);

    const logPath = path.join(tmpDir, 'sprint-log', `${today}_msg-test`, 'LOG.md');
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('Via message flag.');
  });
});

// ── --sprint <slug> flag ───────────────────────────────────────────────────────
describe('log: --sprint flag', () => {
  it('appends to the named sprint folder, not the latest', async () => {
    const today = localToday();
    const oldDate = '2026-01-15';

    // Two sprint folders; latest is "newer"
    makeSprintFolder('newer', today);
    makeSprintFolder('older', oldDate);

    await expect(run({ input: 'Targeting older sprint.', sprint: 'older' })).rejects.toThrow(
      /process\.exit\(0\)/
    );

    const logPath = path.join(tmpDir, 'sprint-log', `${oldDate}_older`, 'LOG.md');
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('Targeting older sprint.');

    // Ensure newer sprint was NOT written
    const newerLog = path.join(tmpDir, 'sprint-log', `${today}_newer`, 'LOG.md');
    expect(fs.existsSync(newerLog)).toBe(false);
  });
});

// ── Error: no sprint-log directory ─────────────────────────────────────────────
describe('log: no sprint-log directory', () => {
  it('exits 2 with helpful message', async () => {
    await expect(run({ input: 'anything' })).rejects.toThrow(/process\.exit\(2\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('No sprint-log directory')
    );
  });
});

// ── Error: no matching sprint slug ─────────────────────────────────────────────
describe('log: no matching sprint slug', () => {
  it('exits 2 with helpful message when slug not found', async () => {
    const today = localToday();
    // Create sprint-log dir with one folder, but look for a different slug
    makeSprintFolder('existing', today);

    await expect(run({ input: 'entry', sprint: 'nonexistent' })).rejects.toThrow(
      /process\.exit\(2\)/
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent')
    );
  });
});

// ── Error: empty entry ─────────────────────────────────────────────────────────
describe('log: empty entry', () => {
  it('exits 1 with "Empty log entry" message', async () => {
    const today = localToday();
    makeSprintFolder('empty-test', today);

    await expect(run({ message: '' })).rejects.toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Empty log entry')
    );
  });

  it('exits 1 for whitespace-only entry', async () => {
    const today = localToday();
    makeSprintFolder('ws-test', today);

    await expect(run({ input: '   \n  ' })).rejects.toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Empty log entry')
    );
  });
});

// ── --json flag ────────────────────────────────────────────────────────────────
describe('log: --json flag', () => {
  it('emits JSON to stdout AND writes to disk', async () => {
    const today = localToday();
    makeSprintFolder('json-sprint', today);

    await expect(run({ input: 'JSON test entry.', json: true })).rejects.toThrow(
      /process\.exit\(0\)/
    );

    // stdout.write should have been called with valid JSON
    const writeCalls = process.stdout.write.mock.calls.flat().join('');
    const parsed = JSON.parse(writeCalls.trim());
    expect(parsed).toMatchObject({
      sprint: expect.stringContaining('json-sprint'),
      date: today,
      entry: 'JSON test entry.',
    });

    // Also written to disk
    const logPath = path.join(tmpDir, 'sprint-log', `${today}_json-sprint`, 'LOG.md');
    expect(fs.existsSync(logPath)).toBe(true);
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('JSON test entry.');
  });

  it('does NOT call console.log when --json is set', async () => {
    const today = localToday();
    makeSprintFolder('json-quiet', today);

    await expect(run({ input: 'Quiet.', json: true })).rejects.toThrow(/process\.exit\(0\)/);
    expect(console.log).not.toHaveBeenCalled();
  });
});

// ── Latest sprint detection (no --sprint) ──────────────────────────────────────
describe('log: latest sprint auto-detection', () => {
  it('picks the most recent sprint by date prefix when multiple exist', async () => {
    makeSprintFolder('old-sprint', '2026-01-01');
    makeSprintFolder('new-sprint', '2026-03-01');

    await expect(run({ input: 'Auto-detected entry.' })).rejects.toThrow(/process\.exit\(0\)/);

    const newerLog = path.join(tmpDir, 'sprint-log', '2026-03-01_new-sprint', 'LOG.md');
    const olderLog = path.join(tmpDir, 'sprint-log', '2026-01-01_old-sprint', 'LOG.md');
    expect(fs.existsSync(newerLog)).toBe(true);
    expect(fs.existsSync(olderLog)).toBe(false);

    const content = fs.readFileSync(newerLog, 'utf8');
    expect(content).toContain('Auto-detected entry.');
  });
});

// ── File-write error ───────────────────────────────────────────────────────────
describe('log: file-write error', () => {
  it('exits 1 with path and error message when writeFileSync throws', async () => {
    const today = localToday();
    makeSprintFolder('write-fail', today);

    vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
      throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
    });

    await expect(run({ input: 'Should fail.' })).rejects.toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('LOG.md')
    );
  });
});
