#!/usr/bin/env node
// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * bin/rootnux.mjs
 *
 * CLI entry point for RootNuX — the intent layer of the 6-NUX taxonomy.
 *
 * Verbs:
 *   init             — scaffold requirements/REQUIREMENTS.md + TRACEABILITY.md + risks/ + docs/adr/
 *   lint             — validate R-XX schema, cross-links, status values
 *   adr-new <title>  — scaffold a new ADR with sequential numbering
 *   risk-add         — append a templated row to the risk register
 *   status           — show DONE/BLOCKED/PARTIAL/NOT STARTED/... counts + %
 *
 * Exit codes:
 *   0  success
 *   1  generic error
 *   2  missing prerequisite (rootnux init not run, missing file)
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
let version = '0.4.1-alpha.1';
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? version;
} catch {
  // package.json not present — use default
}

// ── Command imports ──────────────────────────────────────────────────────────

const { runInit }    = await import('../src/commands/init.mjs');
const { runLint }    = await import('../src/commands/lint.mjs');
const { runAdrNew }  = await import('../src/commands/adr-new.mjs');
const { runRiskAdd } = await import('../src/commands/risk-add.mjs');
const { runStatus }  = await import('../src/commands/status.mjs');

// ── Root program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('rootnux')
  .description('rootnux — intent layer of the 6-NUX taxonomy')
  .version(version);

// ── init ──────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description(
    'Scaffold rootnux artifacts in cwd: requirements/REQUIREMENTS.md, ' +
    'TRACEABILITY.md, risks/risks.md, docs/adr/. Idempotent — never overwrites.',
  )
  .action(async () => {
    try {
      await runInit({ cwd: process.cwd() });
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(err.exitCode ?? 1);
    }
  });

// ── lint ──────────────────────────────────────────────────────────────────────

program
  .command('lint')
  .description(
    'Validate R-XX schema + cross-links in cwd. ' +
    'Checks status values, duplicate IDs, orphan R-XX (in REQUIREMENTS but not TRACEABILITY). ' +
    'Exit 0 if clean, 1 if errors, 2 if rootnux init not run.',
  )
  .action(async () => {
    try {
      const code = await runLint({ cwd: process.cwd() });
      process.exit(code ?? 0);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(err.exitCode ?? 1);
    }
  });

// ── adr-new ──────────────────────────────────────────────────────────────────

program
  .command('adr-new <title>')
  .description(
    'Scaffold a new ADR in docs/adr/ with sequential NNNN numbering. ' +
    'Creates docs/adr/NNNN-<slug>.md with frontmatter + standard sections.',
  )
  .action(async (title) => {
    try {
      const code = await runAdrNew(title, { cwd: process.cwd() });
      process.exit(code ?? 0);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(err.exitCode ?? 1);
    }
  });

// ── risk-add ──────────────────────────────────────────────────────────────────

program
  .command('risk-add')
  .description(
    'Append a templated row to requirements/risks/risks.md. ' +
    'Auto-increments Risk ID. Run rootnux init first.',
  )
  .action(async () => {
    try {
      const code = await runRiskAdd({ cwd: process.cwd() });
      process.exit(code ?? 0);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(err.exitCode ?? 1);
    }
  });

// ── status ────────────────────────────────────────────────────────────────────

program
  .command('status')
  .description(
    'Show requirement completion status: DONE / BLOCKED / PARTIAL / NOT STARTED / ... counts + %. ' +
    'Reads requirements/REQUIREMENTS.md.',
  )
  .option('--json', 'emit machine-readable JSON output')
  .action(async (opts) => {
    try {
      const code = await runStatus({ cwd: process.cwd(), json: opts.json ?? false });
      process.exit(code ?? 0);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(err.exitCode ?? 1);
    }
  });

// ── parse ─────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
