#!/usr/bin/env node
// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * bin/fruitnux.mjs
 *
 * CLI entry point for FruitNuX — external deliverables layer of the 6-NUX taxonomy.
 *
 * Verbs (promoted from branchnux in v0.6, AP-F7):
 *   sca init <surface>             — scaffold SCA template
 *   sca generate <surface>         — fill SCA evidence rows
 *   sca pdf <surface>              — render SCA to PDF
 *   sca oscal <surface>            — emit NIST OSCAL 1.1.2 assessment-results JSON
 *   sign <surface>                 — record HMAC-chained UAT attestation
 *   sign pdf <surface>             — render sign-off ledger to PDF
 *   sign stale-check <surface>     — flag entries older than threshold
 *   br init <id>                   — scaffold BR-XX entry
 *   br link <br-id> <r-ids>        — add BR-XX → R-ID mapping
 *   br rtm                         — render UAT_TRACEABILITY.md
 *   rtm                            — regenerate requirements/TRACEABILITY.md
 *
 * Exit codes:
 *   0  success
 *   1  generic error
 *   2  missing or invalid input
 *   3  parse error (malformed markdown / frontmatter)
 *   4  render failed (XLSX or HTML generation error)
 *
 * Global flags:
 *   --json           — emit all output as newline-delimited JSON records
 *   --help           — show help for any command
 */

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
let version = '0.1.0';
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? version;
} catch {
  // package.json not present during development — use default
}

// ── Command imports ──────────────────────────────────────────────────────────

const { runRtm } = await import('../src/commands/rtm.mjs');
const { runScaInit, runScaGenerate, runScaPdf } = await import('../src/commands/sca.mjs');
const { runBrInit, runBrLink, runBrRtm } = await import('../src/commands/br.mjs');
const { runSign } = await import('../src/commands/sign.mjs');
const { runSignPdf } = await import('../src/commands/sign-pdf.mjs');
const { runSignStaleCheck } = await import('../src/commands/sign-stale.mjs');
const { runScaOscal } = await import('../src/commands/sca-oscal.mjs');

// ── Root program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('fruitnux')
  .description('FruitNuX — external deliverables layer of the 6-NUX taxonomy. Produces audit packets, SCAs, sign-off ledgers, RTMs, and OSCAL evidence.')
  .version(version)
  .option('--json', 'emit all output as newline-delimited JSON records');

// ── rtm ───────────────────────────────────────────────────────────────────────

program
  .command('rtm')
  .description(
    'Generate requirements/TRACEABILITY.md by cross-referencing R-IDs across ' +
    'REQUIREMENTS.md, sprint-log summaries, inline code annotations (// R-XX), ' +
    'and test-plan.md files. Human-edited Notes columns survive regeneration.',
  )
  .option('--dry-run', 'print generated content to stdout without writing the file')
  .option('--strict', 'exit 1 if any R-ID has no code or test evidence')
  .option('--config <path>', 'path to branchnux.config.mjs for glob overrides; executes the file as a Node.js module — must be inside cwd, ext .mjs/.js/.cjs')
  .action(async (opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runRtm({
        dryRun: opts.dryRun ?? false,
        strict: opts.strict ?? false,
        config: opts.config,
        json: global.json,
        cwd: process.cwd(),
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── sca ───────────────────────────────────────────────────────────────────────

const scaCmd = program
  .command('sca')
  .description(
    'Security Control Assessment generator. Subcommands: init, generate, pdf, oscal. ' +
    'Produces an 8-section SCA markdown document mapped to R-IDs and test evidence.',
  );

scaCmd
  .command('init <surface>')
  .description(
    'Scaffold requirements/validations/<surface>/v1.0_<DATE>.md from the canonical ' +
    '8-section SCA template. Human-edited sections survive subsequent generate runs.',
  )
  .option('--industry <industry>', 'industry standards profile (general|fintech|healthcare|malaysia-banking)', 'general')
  .option('--dry-run', 'print generated content to stdout without writing the file')
  .option('--config <path>', 'path to branchnux.config.mjs; executes the file as a Node.js module — must be inside cwd, ext .mjs/.js/.cjs')
  .option('--standards-version <version>', 'standards snapshot version recorded in frontmatter', '1.0.0')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runScaInit(surface, {
        industry: opts.industry,
        dryRun: opts.dryRun ?? false,
        config: opts.config,
        json: global.json,
        standardsVersion: opts.standardsVersion,
        cwd: process.cwd(),
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

scaCmd
  .command('generate <surface>')
  .description(
    'Fill per-control evidence rows in the latest SCA for <surface> using current ' +
    'test results and R-ID mappings. [VERIFY] marks cells needing human or LLM review.',
  )
  .option('--dry-run', 'print updated content to stdout without writing the file')
  .option('--config <path>', 'path to branchnux.config.mjs; executes the file as a Node.js module — must be inside cwd, ext .mjs/.js/.cjs')
  .option('--standards-version <version>', 'standards snapshot version recorded in frontmatter', '1.0.0')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runScaGenerate(surface, {
        dryRun: opts.dryRun ?? false,
        config: opts.config,
        json: global.json,
        standardsVersion: opts.standardsVersion,
        cwd: process.cwd(),
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

scaCmd
  .command('pdf <surface>')
  .description(
    'Render the latest SCA for <surface> to PDF via puppeteer-core (optional dep). ' +
    'Set CHROME_PATH env var if Chrome is not auto-detected.',
  )
  .option('--dry-run', 'show what would be rendered without writing the file')
  .option('--config <path>', 'path to branchnux.config.mjs; executes the file as a Node.js module — must be inside cwd, ext .mjs/.js/.cjs')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runScaPdf(surface, {
        dryRun: opts.dryRun ?? false,
        config: opts.config,
        json: global.json,
        cwd: process.cwd(),
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── sca oscal (OSCAL emitter) ─────────────────────────────────────────────────

scaCmd
  .command('oscal <surface>')
  .description(
    'Emit an OSCAL 1.1.2 assessment-results JSON document from the latest SCA ' +
    'for <surface>. Compatible with IBM Compliance Trestle. ' +
    'S3: auto-merges uat-log.jsonl into OSCAL assessment-log when found. ' +
    'Output: requirements/validations/<surface>/v<X.Y>.oscal.json',
  )
  .option('--validate', 'run schema check on the emitted OSCAL JSON; exit 1 if invalid')
  .option('--out <dir>', 'write OSCAL JSON to <dir> instead of alongside the source file')
  .option('--dry-run', 'parse and validate but do not write the output file')
  .option('--uat-log <path>', '(S3) explicit path to uat-log.jsonl to merge into assessment-log')
  .option('--skip-assessment-log', '(S3) skip uat-log merge even if file is found automatically')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runScaOscal(surface, {
        validate:          opts.validate ?? false,
        out:               opts.out,
        dryRun:            opts.dryRun ?? false,
        json:              global.json,
        cwd:               process.cwd(),
        uatLogPath:        opts.uatLog,
        skipAssessmentLog: opts.skipAssessmentLog ?? false,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── br ────────────────────────────────────────────────────────────────────────

const brCmd = program
  .command('br')
  .description(
    'Business Requirements (BR-XX) management. Subcommands: init, link, rtm. ' +
    'Adds a BR layer above R-XX in the traceability matrix for stakeholder UAT sign-off.',
  );

brCmd
  .command('init <id>')
  .description(
    'Scaffold a BR-XX entry in requirements/BUSINESS_REQUIREMENTS.md. ' +
    'Creates the file if it does not exist. Idempotent — skips if BR-ID already present.',
  )
  .option('--out <dir>', 'project root (default: current directory)', '.')
  .action(async (id, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runBrInit(id, { outDir: opts.out, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

brCmd
  .command('link <br-id> <r-ids>')
  .description(
    'Add a BR-XX → R-ID mapping in requirements/BUSINESS_REQUIREMENTS.md. ' +
    'r-ids is a comma-separated list (e.g. R-01,R-02,R-03).',
  )
  .option('--out <dir>', 'project root (default: current directory)', '.')
  .action(async (brId, rIds, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runBrLink(brId, rIds, { outDir: opts.out, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

brCmd
  .command('rtm')
  .description(
    'Render requirements/UAT_TRACEABILITY.md — a BR-XX → R-XX → TC-XX mapping table. ' +
    'Reads BUSINESS_REQUIREMENTS.md; TC-XX column is informational until `br codify`.',
  )
  .option('--out <dir>', 'project root (default: current directory)', '.')
  .action(async (opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runBrRtm({ outDir: opts.out, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── sign ──────────────────────────────────────────────────────────────────────
//
// Subcommand group:
//   fruitnux sign <surface>              — record an attestation
//   fruitnux sign pdf <surface>          — render PDF ledger
//   fruitnux sign stale-check <surface>  — check entry ages
//
// Commander routes to a subcommand when the first positional arg matches a
// registered subcommand name ('pdf', 'stale-check'). Otherwise the group's
// own action handler fires, preserving the `fruitnux sign <surface>` invocation.

const signCmd = program
  .command('sign')
  .description(
    'UAT sign-off commands.\n' +
    '  fruitnux sign <surface>             — record an attestation\n' +
    '  fruitnux sign pdf <surface>         — render sign-off ledger to PDF\n' +
    '  fruitnux sign stale-check <surface> — flag entries older than threshold',
  )
  .argument('[surface]', 'test-pass surface folder (required for direct attestation)')
  .option('--reject <tc-id>', 'batch-reject a specific TC-ID (status set to rejected)')
  .option('--verify', 'verify chain integrity of <surface>/uat-log.jsonl and exit')
  .option('--justify-with-llm', '(S4) draft justification via Claude API before prompting; falls back gracefully if CLAUDE_API_KEY is absent')
  .option('--revoke', '(S5) append a revocation entry to br-attestations.jsonl; requires --tc and --role')
  .option('--tc <tc-id>', '(S5) TC-ID to revoke (used with --revoke)')
  .option('--role <role>', '(S5) role to revoke (used with --revoke)')
  .option('--br-id <br-id>', '(S5) BR-ID to scope the revocation (optional; defaults to surface name)')
  .option('--out <dir>', 'project root (default: current directory)', '.')
  .allowUnknownOption(false)
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.opts();

    if (!surface) {
      // No surface provided and no subcommand matched — print help.
      cmd.help();
      return;
    }

    try {
      if (opts.verify) {
        const { verifyChain } = await import('../src/lib/uat-log.mjs');
        const pathMod = await import('path');
        const logPath = pathMod.default.resolve(opts.out, surface, 'uat-log.jsonl');
        const secret = process.env.UAT_SECRET;
        if (!secret) {
          emit(global.json, { error: 'UAT_SECRET is required for chain verification' });
          process.exit(2);
        }
        const result = verifyChain(logPath, secret);
        emit(global.json, { event: 'sign.verify', ...result });
        if (!global.json) {
          if (result.valid) {
            console.log(`[sign --verify] Chain is valid (${logPath})`);
          } else {
            console.log(`[sign --verify] Chain BROKEN at line ${result.brokenAt}`);
            for (const e of result.errors) console.log(`  ${e}`);
          }
        }
        process.exit(result.valid ? 0 : 1);
      }
      await runSign(surface, {
        reject:         opts.reject,
        justifyWithLlm: opts.justifyWithLlm ?? false,
        revoke:         opts.revoke ?? false,
        tc:             opts.tc,
        role:           opts.role,
        brId:           opts.brId,
        outDir:         opts.out,
        json:           global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── sign pdf ──────────────────────────────────────────────────────────────────

signCmd
  .command('pdf <surface>')
  .description(
    'Render the UAT sign-off ledger for <surface> to an A4 PDF via puppeteer-core. ' +
    'Reads <surface>/uat-log.jsonl and <surface>/uat-sign-off.md. ' +
    'Verifies HMAC-SHA256 chain; includes a red "CHAIN BROKEN" banner if invalid. ' +
    'Requires CHROME_PATH env var. Optional dep: npm install puppeteer-core.',
  )
  .option('--folder <dir>', 'root directory containing <surface>/ (default: CWD)', '.')
  .option('--output <path>', 'explicit output path for the PDF')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runSignPdf(surface, {
        folder: opts.folder,
        output: opts.output,
        json:   global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── sign stale-check ──────────────────────────────────────────────────────────

signCmd
  .command('stale-check <surface>')
  .description(
    'Report UAT sign-off entries older than --threshold (default: 90d). ' +
    'Exits 0 unless --strict is set and stale entries are found (CI gate). ' +
    'Suggests the re-attestation command for each stale TC.',
  )
  .option('--folder <dir>', 'root directory containing <surface>/ (default: CWD)', '.')
  .option('--threshold <duration>', 'age threshold, e.g. 7d, 30d, 90d, 180d, 365d', '90d')
  .option('--strict', 'exit 1 when stale entries are found (CI gate mode)')
  .action(async (surface, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runSignStaleCheck(surface, {
        folder:    opts.folder,
        threshold: opts.threshold,
        json:      global.json,
        strict:    opts.strict ?? false,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── helpers ──────────────────────────────────────────────────────────────────

function emit(isJson, payload) {
  if (isJson) {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } else if (payload.error) {
    process.stderr.write(`ERROR: ${payload.error}\n`);
  }
}

// ── parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
