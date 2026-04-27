// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/init.mjs
 *
 * Implements `rootnux init`.
 *
 * Scaffolds rootnux artifacts in the current working directory:
 *   requirements/REQUIREMENTS.md   — R-XX table with rxx-v1 frontmatter
 *   requirements/TRACEABILITY.md   — RTM table with rtm-v1 frontmatter
 *   requirements/risks/risks.md    — Risk register table
 *   docs/adr/                      — empty directory for ADRs
 *
 * Idempotent: existing files are skipped, never overwritten.
 * Exit 0 always.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Templates ────────────────────────────────────────────────────────────────

const REQUIREMENTS_TEMPLATE = `---
title: Requirements
schema: rxx-v1
---

# Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| R-01 | Sample requirement — replace with your first real requirement | NOT STARTED | Example row |
`;

const TRACEABILITY_TEMPLATE = `---
schema: rtm-v1
---

# Requirements Traceability Matrix

| R-XX | Sprint | Code File(s) | Test File(s) | Open Gap |
|------|--------|--------------|--------------|----------|
| R-01 | — | — | — | Not yet traced |
`;

const RISKS_TEMPLATE = `# Risk Register

| Risk ID | Domain | Risk | Severity | Status |
|---------|--------|------|----------|--------|
`;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ cwd?: string }} opts
 */
export async function runInit(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();

  const artifacts = [
    {
      relPath: path.join('requirements', 'REQUIREMENTS.md'),
      content: REQUIREMENTS_TEMPLATE,
    },
    {
      relPath: path.join('requirements', 'TRACEABILITY.md'),
      content: TRACEABILITY_TEMPLATE,
    },
    {
      relPath: path.join('requirements', 'risks', 'risks.md'),
      content: RISKS_TEMPLATE,
    },
  ];

  const created = [];
  const skipped = [];

  // Ensure docs/adr/ directory exists
  const adrDir = path.join(cwd, 'docs', 'adr');
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
    created.push('docs/adr/');
  } else {
    skipped.push('docs/adr/');
    console.log(`Skipped: docs/adr/ (exists)`);
  }

  for (const { relPath, content } of artifacts) {
    const absPath = path.join(cwd, relPath);
    const display = relPath.replace(/\\/g, '/');

    // Ensure parent directory exists before attempting exclusive create
    try {
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
    } catch (err) {
      console.error(`ERROR: could not create directory for ${display}: ${err.message}`);
      process.exit(1);
    }

    // Use exclusive open ('wx') to avoid TOCTOU + symlink attacks.
    // If the file (or a symlink target) already exists, EEXIST is thrown → skip.
    let fd;
    try {
      fd = fs.openSync(absPath, 'wx');
      fs.writeSync(fd, content);
      created.push(display);
      console.log(`Created: ${display}`);
    } catch (err) {
      if (err.code === 'EEXIST') {
        skipped.push(display);
        console.log(`Skipped: ${display} (exists)`);
      } else {
        console.error(`ERROR: could not write ${display}: ${err.message}`);
        process.exit(1);
      }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  console.log('');
  console.log(`rootnux init done — created: ${created.length}, skipped: ${skipped.length}`);

  if (created.length > 0) {
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit requirements/REQUIREMENTS.md — add your R-XX requirements');
    console.log('  2. Edit requirements/TRACEABILITY.md — trace each R-XX to code + tests');
    console.log('  3. rootnux lint                      — validate schema + cross-links');
    console.log('  4. rootnux status                    — see completion percentages');
  }
}
