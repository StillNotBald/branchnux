// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/adr-new.mjs
 *
 * Implements `rootnux adr-new <title>`.
 *
 * Creates a new ADR file in docs/adr/ with sequential numbering:
 *   docs/adr/NNNN-<slug>.md
 *
 * Includes YAML frontmatter and standard ADR sections.
 * Exit 0 on success, exit 1 if title is empty.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {string} title
 * @param {{ cwd?: string }} opts
 * @returns {Promise<number>} exit code
 */
export async function runAdrNew(title, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();

  // ── Validate title ────────────────────────────────────────────────────────

  if (!title || typeof title !== 'string' || title.trim() === '') {
    console.error('ERROR: title is required for adr-new');
    console.error('Usage: rootnux adr-new <title>');
    return 1;
  }

  title = title.trim();

  // ── Find next ADR number ──────────────────────────────────────────────────

  const adrDir = path.join(cwd, 'docs', 'adr');
  fs.mkdirSync(adrDir, { recursive: true });

  const existing = fs.readdirSync(adrDir)
    .filter(f => /^\d{4}-.*\.md$/.test(f));

  let highest = 0;
  for (const f of existing) {
    const num = parseInt(f.slice(0, 4), 10);
    if (num > highest) highest = num;
  }

  const next = highest + 1;
  const nnnn = String(next).padStart(4, '0');

  // ── Generate slug ─────────────────────────────────────────────────────────

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (keep spaces and hyphens)
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens

  // Fix 8: empty slug guard — title had no alphanumeric content
  if (!slug) {
    console.error(`ERROR: title contains no alphanumeric characters — cannot derive slug`);
    return 1;
  }

  const filename = `${nnnn}-${slug}.md`;
  const absPath = path.join(adrDir, filename);
  const relPath = path.join('docs', 'adr', filename).replace(/\\/g, '/');

  // Fix 3: path traversal defense-in-depth — ensure resolved path is inside adrDir
  const resolvedAdr = path.resolve(adrDir);
  const resolvedFile = path.resolve(absPath);
  if (!resolvedFile.startsWith(resolvedAdr + path.sep)) {
    console.error(`ERROR: refusing to write outside docs/adr/ — title produced unsafe path`);
    return 1;
  }

  // ── Get today's date ──────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  // ── Build ADR content ─────────────────────────────────────────────────────

  const content = `---
adr: ${nnnn}
title: ${title}
status: proposed
date: ${today}
---

# ADR-${nnnn}: ${title}

## Status

proposed

## Context

Describe the problem and constraints driving this decision.

## Decision

What did we decide?

## Consequences

What's better, what's worse, what's risky?
`;

  // Fix 4: use exclusive create ('wx') to prevent silent overwrite on race
  let fd;
  try {
    fd = fs.openSync(absPath, 'wx');
    fs.writeSync(fd, content);
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.error(
        `ERROR: ADR ${nnnn}-${slug}.md already exists — race or duplicate`
      );
      return 1;
    }
    throw err;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  console.log(`Created: ${relPath}`);

  return 0;
}
