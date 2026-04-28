#!/usr/bin/env node
// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * bin/leafnux.mjs
 *
 * CLI entry point for LeafNuX — the continuous-health layer of the 6-NUX taxonomy.
 *
 * Verbs:
 *   health   — read 5-NUX artifacts in cwd, produce a structured health snapshot
 *
 * Flags (health):
 *   --json           emit machine-readable JSON
 *   --quiet          print only "Overall: GREEN/AMBER/RED"; use exit codes
 *   --check <cat>    run only one category (requirements/risks/adrs/sprint/tests)
 *
 * Exit codes (without --quiet, always 0):
 *   0  GREEN
 *   1  AMBER
 *   2  RED
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
let version = '0.5.0-alpha.1';
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? version;
} catch {
  // package.json not present — use default
}

// ── Command imports ───────────────────────────────────────────────────────────

const { runHealth } = await import('../src/commands/health.mjs');

// ── Root program ──────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('leafnux')
  .description('leafnux — continuous-health layer of the 6-NUX taxonomy')
  .version(version);

// ── health ────────────────────────────────────────────────────────────────────

program
  .command('health')
  .description(
    'Read 5-NUX artifacts in cwd and produce a structured health snapshot. ' +
    'Checks: requirements completion, open risks, ADR status, sprint freshness, test infra.',
  )
  .option('--json', 'emit machine-readable JSON output')
  .option('--quiet', 'print only Overall status line; exit codes 0/1/2 = GREEN/AMBER/RED')
  .option('--check <category>', 'run only one category: requirements, risks, adrs, sprint, tests')
  .action(async (opts) => {
    try {
      const code = await runHealth({
        cwd: process.cwd(),
        json: opts.json ?? false,
        quiet: opts.quiet ?? false,
        check: opts.check ?? null,
      });
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
