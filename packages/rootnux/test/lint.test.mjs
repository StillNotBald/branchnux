// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/lint.test.mjs
 *
 * Tests for `rootnux lint`.
 * Uses os.tmpdir() + fs.mkdtempSync for filesystem isolation.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInit } from '../src/commands/init.mjs';
import { runLint } from '../src/commands/lint.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rootnux-lint-'));
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

function writeTrace(content) {
  const dir = path.join(tmpDir, 'requirements');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'TRACEABILITY.md'), content, 'utf-8');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rootnux lint', () => {
  it('returns exit 2 when REQUIREMENTS.md is missing', async () => {
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(2);
  });

  it('returns exit 0 on clean init scaffolding', async () => {
    // init creates REQUIREMENTS.md and TRACEABILITY.md with matching R-01
    await runInit({ cwd: tmpDir });
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(0);
  });

  it('returns exit 1 for orphan R-XX (in REQUIREMENTS but not TRACEABILITY)', async () => {
    writeReq(`---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| R-01 | First req | DONE | |
| R-02 | Second req | NOT STARTED | |
`);
    writeTrace(`---
schema: rtm-v1
---

| R-XX | Sprint | Code File(s) | Test File(s) | Open Gap |
|------|--------|--------------|--------------|----------|
| R-01 | sprint-1 | src/foo.mjs | test/foo.test.mjs | — |
`);
    // R-02 is in REQUIREMENTS but not in TRACEABILITY — orphan
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('returns exit 1 for unknown status value', async () => {
    writeReq(`---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| R-01 | First req | BANANA | |
`);
    writeTrace(`---
schema: rtm-v1
---

| R-XX | Sprint | Code File(s) | Test File(s) | Open Gap |
|------|--------|--------------|--------------|----------|
| R-01 | — | — | — | — |
`);
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('accepts all valid status values', async () => {
    const statuses = ['DONE', 'BLOCKED', 'PARTIAL', 'NOT STARTED', 'DECLINED', 'DEFERRED', 'FAKE'];
    const reqRows = statuses.map((s, i) => `| R-0${i + 1} | Req ${i + 1} | ${s} | |`).join('\n');
    const traceRows = statuses.map((_, i) => `| R-0${i + 1} | — | — | — | — |`).join('\n');

    writeReq(`---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
${reqRows}
`);
    writeTrace(`---
schema: rtm-v1
---

| R-XX | Sprint | Code File(s) | Test File(s) | Open Gap |
|------|--------|--------------|--------------|----------|
${traceRows}
`);
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(0);
  });

  it('returns exit 1 for duplicate R-XX IDs', async () => {
    writeReq(`---
title: Requirements
schema: rxx-v1
---

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| R-01 | First req | DONE | |
| R-01 | Duplicate! | NOT STARTED | |
`);
    writeTrace(`---
schema: rtm-v1
---

| R-XX | Sprint | Code File(s) | Test File(s) | Open Gap |
|------|--------|--------------|--------------|----------|
| R-01 | — | — | — | — |
`);
    const code = await runLint({ cwd: tmpDir });
    expect(code).toBe(1);
  });
});
