#!/usr/bin/env node
// trunknux CLI — build-layer of the 6-NUX taxonomy.

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newSprint } from '../src/commands/new-sprint.mjs';
import { summarize } from '../src/commands/summarize.mjs';
import { lint } from '../src/commands/lint.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
let version = '0.4.0-alpha.1';
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? version;
} catch {
  // package.json not present — use default
}

const program = new Command();

program
  .name('trunknux')
  .description('trunknux — build layer of the 6-NUX taxonomy')
  .version(version);

program
  .command('new-sprint <slug>')
  .description('Create a date-prefixed sprint folder in sprint-log/')
  .option('--no-readme', 'skip README.md scaffolding')
  .action((slug, opts) => newSprint(slug, opts));

program
  .command('summarize')
  .description('Generate SPRINT_SUMMARY.md from git log for the latest (or named) sprint')
  .option('--sprint <name>', 'sprint slug to summarize (without date prefix)')
  .option('--since <YYYY-MM-DD>', 'git log start date (default: sprint folder date)')
  .option('--until <YYYY-MM-DD>', 'git log end date (default: today)')
  .option('--force', 'overwrite existing SPRINT_SUMMARY.md')
  .action((opts) => summarize(opts));

program
  .command('lint')
  .description('Validate sprint folder naming and README conventions')
  .option('--json', 'machine-readable JSON output')
  .action((opts) => lint(opts));

program.parse();
