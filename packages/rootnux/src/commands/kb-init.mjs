// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/kb-init.mjs
 *
 * Implements `rootnux kb-init`.
 *
 * Scaffolds docs/KNOWLEDGE_BASE.md in the current working directory.
 * Idempotent: existing file is skipped, never overwritten.
 *
 * `--force` makes the absence-of-file requirement explicit: if the file
 * already exists, exit 1 with an error. (Force does NOT overwrite —
 * delete manually then re-run.)
 *
 * Exit 0 on success / skip, 1 on error.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@leapnux/6nux-core/conventions';

// ── Template ──────────────────────────────────────────────────────────────────

const KB_TEMPLATE = `---
schema: kb-v1
title: Knowledge Base
---
# Knowledge Base

## Project objective

<One-paragraph description of what this system is for, who it serves, and why it exists. Replace this placeholder.>

## Business owner

<Name + role + email of the person who owns this system from the business side. Update on org changes.>

## Stakeholders

| Role | Person | Concern |
|---|---|---|
| Project lead | <name> | <one-line concern> |
| Engineering lead | <name> | <one-line concern> |
| QA lead | <name> | <one-line concern> |
| Compliance / Audit liaison | <name> | <one-line concern> |
| Executive sponsor | <name> | <one-line concern> |

## Team resources

- **Repository:** <URL>
- **Issue tracker:** <URL>
- **Documentation:** <URL or local path>
- **Chat / on-call:** <channel>

## Lessons learned

<Append-only log of non-obvious lessons that took time to discover. Each lesson should name what was tried, what failed, and what the rule is now. Auditors love this section because it demonstrates institutional learning, not surface compliance.>

- (none yet — add one when you discover something worth keeping)

## Audit prep contacts

| Audit type | Contact | Notes |
|---|---|---|
| SOC 2 | <name + email> | <when last audited, where evidence lives> |
| ISO 27001 | <name + email> | <when last audited, where evidence lives> |
| Internal audit | <name + email> | <cadence> |

## Compliance + regulatory mapping

<Which standards apply to this system: SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, NYDFS, etc. One line each, plus where the relevant controls live in code/docs.>

## Vendor / sub-processor list

<Cross-link to docs/governance/sub-processors.md if it exists, or list inline:>

| Vendor | Service | Data touched | DPA status |
|---|---|---|---|
| <vendor> | <e.g. hosting, KYC, monitoring> | <e.g. PII, none, metadata only> | <signed / pending / N/A> |

## Disaster recovery + business continuity

- **RTO:** <hours>
- **RPO:** <hours>
- **Backup location:** <where>
- **Restore drill cadence:** <frequency, last drill date>

## When to update this file

- New stakeholder joins or leaves
- New audit cycle begins
- New compliance standard added to scope
- A lesson learned that took >1 hr to discover
- Vendor list changes

This file is part of the audit-evidence chain. Reviewers will compare it against the live system — accuracy matters more than completeness.
`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {{ cwd?: string, force?: boolean }} opts
 * @returns {Promise<number>} exit code
 */
export async function runKbInit(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const force = opts.force ?? false;

  const relPath = PATHS.kb;
  const absPath = path.join(cwd, relPath);
  const display = relPath.replace(/\\/g, '/');

  // --force: refuse if file already exists
  if (force && fs.existsSync(absPath)) {
    console.error(
      `Refusing to overwrite. Edit manually or rm and re-run.`
    );
    return 1;
  }

  // Ensure parent directory exists before attempting exclusive create
  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
  } catch (err) {
    console.error(`ERROR: could not create directory for ${display}: ${err.message}`);
    return 1;
  }

  // Use exclusive open ('wx') to avoid TOCTOU + symlink attacks.
  // If the file (or a symlink target) already exists, EEXIST is thrown → skip.
  let fd;
  try {
    fd = fs.openSync(absPath, 'wx');
    fs.writeSync(fd, KB_TEMPLATE);
    console.log(`Created: ${display}`);
    return 0;
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.log(`Skipped: ${display} (exists)`);
      return 0;
    }
    console.error(`ERROR: could not write ${display}: ${err.message}`);
    return 1;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
