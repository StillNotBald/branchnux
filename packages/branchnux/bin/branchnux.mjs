#!/usr/bin/env node
// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * bin/branchnux.mjs
 *
 * CLI entry point for BranchNuX — verification node of the 6-NUX taxonomy.
 *
 * Verbs (testing + validation focus, post AP-F7 split):
 *   init <slug>         — scaffold a per-page test-pass folder from templates
 *   plan <slug>         — AI-drafted test plan
 *   codify <slug>       — convert test-plan.md to Playwright spec.ts
 *   enrich <slug>       — append enrichment passes to an existing test plan
 *   discover <url>      — browse a page and emit scenarios.md
 *   batch-plan          — parallel LLM agents: discover→plan→codify→enrich
 *   report <folder>     — generate XLSX + self-contained HTML report
 *   validate <folder>   — lint markdown frontmatter
 *   run <slug>          — env-aware test-pass scaffold + report
 *   compare <slug>      — diff TC results between two environment passes
 *   visual baseline     — capture full-page baseline screenshots
 *   visual compare      — compare current screenshots against baseline
 *   doctor              — preflight checks for Playwright, Node, Supabase config
 *   demo                — run bundled demo
 *
 * DEPRECATED verbs (moved to fruitnux in v0.6, will be REMOVED in v0.7):
 *   sca, sign, br, rtm  — use `fruitnux <verb>` instead
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
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
let version = '0.1.0';
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? version;
} catch {
  // package.json not present during development — use default
}

// ── fruitnux binary path (for deprecation shims) ─────────────────────────────

const FRUITNUX_BIN = path.resolve(__dirname, '../../fruitnux/bin/fruitnux.mjs');

// ── Deprecation shim helper ───────────────────────────────────────────────────

/**
 * Print a v0.6 deprecation warning and forward to fruitnux.
 * Used by every verb that moved in AP-F7.
 *
 * @param {string} verb   Top-level verb name (e.g. 'sca', 'sign', 'br', 'rtm')
 * @param {string[]} args Remaining argv after the verb
 */
function deprecatedForward(verb, args) {
  process.stderr.write(
    `WARNING: 'branchnux ${verb}' has moved to 'fruitnux ${verb}' in v0.6. ` +
    `The branchnux alias will be removed in v0.7. ` +
    `Run 'fruitnux ${verb} ...' instead.\n`,
  );
  const result = spawnSync(process.execPath, [FRUITNUX_BIN, verb, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

// ── Command imports ──────────────────────────────────────────────────────────

const { runInit } = await import('../src/commands/init.mjs');
const { runReport } = await import('../src/commands/report.mjs');
const { runValidate } = await import('../src/commands/validate.mjs');
const { runDemo } = await import('../src/commands/demo.mjs');
const { runDoctor } = await import('../src/commands/doctor.mjs');
const { runEnvRun, runEnvCompare } = await import('../src/commands/env.mjs');
const { runVisualBaseline, runVisualCompare } = await import('../src/commands/visual.mjs');
// v0.2 LLM agents
const { runDiscover }  = await import('../src/commands/discover.mjs');
const { runPlan }      = await import('../src/commands/plan.mjs');
const { runCodify }    = await import('../src/commands/codify.mjs');
const { runEnrich }    = await import('../src/commands/enrich.mjs');
const { runBatchPlan } = await import('../src/commands/batch.mjs');

// ── Root program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('branchnux')
  .description('BranchNuX — verification node of the 6-NUX taxonomy. Structured test-pass documentation for regulated web apps.')
  .version(version)
  .option('--json', 'emit all output as newline-delimited JSON records');

// ── init ─────────────────────────────────────────────────────────────────────

program
  .command('init <slug>')
  .description(
    'Scaffold a per-page test-pass folder using templates. ' +
    'Creates testing-log/<date>_<slug>/ with test-plan.md, spec.ts, README.md, evidence/.',
  )
  .option('--industry <industry>', 'industry profile to use for standards alignment', 'general')
  .option('--out <dir>', 'output root (default: ./testing-log/)', './testing-log')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runInit(slug, { industry: opts.industry, outDir: opts.out, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── report ───────────────────────────────────────────────────────────────────

program
  .command('report <folder>')
  .description(
    'Generate XLSX + self-contained HTML report from test-plan.md + execution-log.md ' +
    'inside <folder>. Writes report.xlsx and report.html alongside the source files.',
  )
  .option('--plan-only', 'render without execution results (PLAN ONLY badge in header)')
  .option('--open', 'open the generated HTML in the default browser after rendering')
  .action(async (folder, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runReport(folder, { planOnly: opts.planOnly, open: opts.open, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 4);
    }
  });

// ── validate ─────────────────────────────────────────────────────────────────

program
  .command('validate <folder>')
  .description(
    'Lint markdown frontmatter in <folder>: check required keys, R-XX format, TC-ID ' +
    'consistency, industry field, status taxonomy. Exits non-zero if errors found.',
  )
  .option('--strict', 'treat warnings as errors')
  .action(async (folder, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runValidate(folder, { strict: opts.strict, json: global.json });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 3);
    }
  });

// ── demo ─────────────────────────────────────────────────────────────────────

program
  .command('demo')
  .description(
    'Open the bundled demo execution report in your default browser. ' +
    'A real branchnux report output (13 PASS / 2 BLOCKED-CONFIG, 13 embedded ' +
    'screenshots, standards-alignment matrix, threat coverage). ' +
    'The fastest path to "aha" for first-time users.',
  )
  .option('--no-open', 'print the path without launching a browser (CI-friendly)')
  .action(async (opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runDemo({ json: global.json, noOpen: opts.open === false });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── doctor ───────────────────────────────────────────────────────────────────

program
  .command('doctor')
  .description(
    'Preflight checks: Node version, Playwright browsers, config-driven env vars ' +
    '(from branchnux.config.mjs), prod-build vs dev-server detection, convention folders. ' +
    'Opt-in checks: --check supabase (MFA Enroll/Verify toggle mismatch, FirstLeap-specific).',
  )
  .option(
    '--check <check>',
    'run only a specific check (node|playwright|env|build|conventions|supabase). ' +
    'Note: "supabase" is opt-in only — it does not run in the default doctor pass.',
  )
  .option('--project-ref <ref>', 'Supabase project ref (required for --check supabase)')
  .action(async (opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runDoctor({
        check: opts.check,
        projectRef: opts.projectRef,
        json: global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── discover (Claude API) ────────────────────────────────────────────────────

program
  .command('discover <url>')
  .description(
    'Browse a page and emit scenarios.md with Given/When/Then TCs. ' +
    'Fetches page HTML, extracts DOM summary, calls Claude API, writes scenarios.md. ' +
    'Requires: CLAUDE_API_KEY env var + npm install @anthropic-ai/sdk',
  )
  .option('--slug <slug>', 'override the derived slug used in frontmatter')
  .option('--output <dir>', 'output directory for scenarios.md (default: .)', '.')
  .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-6')
  .option('--max-tokens <n>', 'max tokens in LLM response', (v) => parseInt(v, 10), 8000)
  .option('--dry-run', 'print the prompt and cost estimate without calling the API')
  .action(async (url, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runDiscover(url, {
        slug:      opts.slug,
        output:    opts.output,
        model:     opts.model,
        maxTokens: opts.maxTokens,
        dryRun:    opts.dryRun ?? false,
        json:      global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── plan (Claude API) ────────────────────────────────────────────────────────

program
  .command('plan <slug>')
  .description(
    'Convert scenarios.md + page DOM into a structured test-plan.md with ' +
    'frontmatter (slug, industry, r_ids, tc_prefix), TC matrix, and per-TC ' +
    'Given/When/Then. [VERIFY] markers on every LLM-generated cell. ' +
    'Requires: CLAUDE_API_KEY env var + npm install @anthropic-ai/sdk',
  )
  .option('--url <url>', 'live page URL for DOM snapshot (optional)')
  .option('--industry <industry>', 'industry profile for standards alignment', 'general')
  .option('--out <dir>', 'output root for testing-log/', './testing-log')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runPlan(slug, {
        url:      opts.url,
        industry: opts.industry,
        out:      opts.out,
        json:     global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── codify (Claude API) ──────────────────────────────────────────────────────

program
  .command('codify <slug>')
  .description(
    'Convert testing-log/<date>_<slug>/test-plan.md into a Playwright TypeScript ' +
    'spec.ts via Claude API. Generates vanilla Playwright tests that work in any ' +
    'framework. Use --test-conventions to inject stack-specific patterns. ' +
    'Requires: CLAUDE_API_KEY env var + npm install @anthropic-ai/sdk',
  )
  .option('--folder <path>', 'explicit path to testing-log/<date>_<slug>/ (overrides slug search)')
  .option('--base-url <url>', 'base URL for Playwright tests', 'http://localhost:3000')
  .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-6')
  .option('--max-tokens <n>', 'max tokens in LLM response', (v) => parseInt(v, 10), 10000)
  .option('--max-spend <usd>', 'abort if estimated cost exceeds this USD amount', parseFloat)
  .option('--dry-run', 'print the prompt and cost estimate without calling the API')
  .option('--safe', 'write spec.generated.ts instead of overwriting spec.ts')
  .option(
    '--test-conventions <name>',
    'load a named test-conventions profile and inject its patterns into the prompt ' +
    '(e.g. nextjs-supabase). Profiles live at src/config/test-conventions/<name>.json. ' +
    'Without this flag, codify generates vanilla Playwright tests compatible with any framework.',
  )
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runCodify(slug, {
        folder:           opts.folder,
        baseUrl:          opts.baseUrl,
        model:            opts.model,
        maxTokens:        opts.maxTokens,
        maxSpend:         opts.maxSpend ?? null,
        dryRun:           opts.dryRun ?? false,
        safe:             opts.safe ?? false,
        testConventions:  opts.testConventions ?? null,
        json:             global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── enrich (Claude API) ──────────────────────────────────────────────────────

program
  .command('enrich <slug>')
  .description(
    'Run three append-only enrichment passes on an existing test plan: ' +
    'design-review (a11y/visual/mobile), qa-structural (boundary/error/empty), ' +
    'graph-context (cross-surface integration). Marker-bounded so human edits ' +
    'survive regeneration. Requires CLAUDE_API_KEY env var + @anthropic-ai/sdk.',
  )
  .option('--url <url>', 'live page URL for design-review pass (optional)')
  .option('--passes <passes>', 'comma-separated passes to run: design,qa,graph', 'design,qa,graph')
  .option('--out <dir>', 'output root for testing-log/', './testing-log')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runEnrich(slug, {
        url:    opts.url,
        passes: opts.passes.split(',').map((p) => p.trim()),
        out:    opts.out,
        json:   global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── batch-plan (parallel Claude API dispatch) ────────────────────────────────

program
  .command('batch-plan')
  .description(
    'Dispatch parallel LLM agents to run discover→plan→codify→enrich for ' +
    'multiple pages in one command. Replacement-agent pattern (one page failing ' +
    'doesn\'t abort the batch) + cumulative --max-spend enforcement. ' +
    'Requires CLAUDE_API_KEY env var + @anthropic-ai/sdk.',
  )
  .requiredOption('--pages <pages>', 'comma-separated page slugs or URLs')
  .option('--max-spend <usd>', 'abort if estimated cost exceeds this USD amount', parseFloat)
  .option('--pages-per-agent <n>', 'pages per sub-agent batch (default: 5)', parseInt, 5)
  .option('--dry-run', 'estimate cost without running any LLM calls')
  .option('--out <dir>', 'output root for testing-log/', './testing-log')
  .action(async (opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      await runBatchPlan({
        pages:         opts.pages,
        maxSpend:      opts.maxSpend ?? null,
        pagesPerAgent: opts.pagesPerAgent ?? 5,
        dryRun:        opts.dryRun ?? false,
        out:           opts.out,
        json:          global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── run (env-aware) ───────────────────────────────────────────────────────────

program
  .command('run <slug>')
  .description(
    'Scaffold an env-suffixed test-pass folder and generate XLSX + HTML reports. ' +
    'Creates testing-log/<date>_<slug>-<env>/, seeds test-plan.md from a base plan, ' +
    'then runs the report generator. Wraps `report` with per-env naming.',
  )
  .option('--env <env>', 'target environment: local|staging|prod|qa|ci|dev|<custom>', 'local')
  .option('--base-url <url>', 'base URL to inject into test-plan.md frontmatter')
  .option('--plan-only', 'generate report without execution results (PLAN ONLY badge)')
  .option('--open', 'open the generated HTML in the default browser after rendering')
  .option('--fail-on-missing', 'exit 1 if no execution-log and no evidence/ directory')
  .option('--folder <path>', 'explicit output folder path (overrides date+slug+env naming)')
  .option('--out <dir>', 'testing-log root (default: ./testing-log/)', './testing-log')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      const code = await runEnvRun(slug, {
        env:           opts.env,
        baseUrl:       opts.baseUrl,
        planOnly:      opts.planOnly ?? false,
        open:          opts.open ?? false,
        failOnMissing: opts.failOnMissing ?? false,
        folder:        opts.folder,
        outDir:        opts.out,
        json:          global.json,
      });
      if (code) process.exit(code);
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── compare ───────────────────────────────────────────────────────────────────

program
  .command('compare <slug> <env-a> <env-b>')
  .description(
    'Diff TC results between two environment passes for the same slug. ' +
    'Locates the most recent testing-log/<date>_<slug>-<env>/ folder for each env, ' +
    'parses execution logs, and emits a markdown table with MATCH / REGRESSION / ' +
    'PROMOTION / DIVERGE / MISSING-A / MISSING-B verdicts.',
  )
  .option('--output <path>', 'write diff table to <path> instead of stdout')
  .option('--threshold <n>', 'CI gate: exit 1 if regressions > threshold (use 0 for strict)', parseFloat)
  .option('--out <dir>', 'testing-log root (default: ./testing-log/)', './testing-log')
  .action(async (slug, envA, envB, opts, cmd) => {
    const global = cmd.parent.opts();
    try {
      const code = await runEnvCompare(slug, envA, envB, {
        outDir:    opts.out,
        output:    opts.output,
        threshold: opts.threshold,
        json:      global.json,
      });
      if (code) process.exit(code);
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

// ── visual ────────────────────────────────────────────────────────────────────

const visualCmd = program
  .command('visual')
  .description(
    'Visual regression testing. Subcommands: baseline, compare. ' +
    'Optional dep: npm install pixelmatch pngjs. ' +
    'Configurable via branchnux.config.mjs visual.diffThreshold (default 5%).',
  );

visualCmd
  .command('baseline <slug>')
  .description(
    'Capture full-page baseline screenshots for all TCs in <slug>/. ' +
    'Stored at <slug>/visual-baseline/<TC-ID>.png. ' +
    'Requires @playwright/test: npm install --save-dev @playwright/test && npx playwright install chromium.',
  )
  .option('--out <dir>', 'testing-log root (default: ./testing-log/)', './testing-log')
  .option('--folder <path>', 'explicit path to test-pass folder (overrides slug search)')
  .option('--base-url <url>', 'base URL of the running application', 'http://localhost:3000')
  .option('--viewport <WxH>', 'viewport size as WIDTHxHEIGHT (default: 1280x800)', '1280x800')
  .option('--urls <pairs>', 'comma-separated TC-ID=URL pairs, e.g. TC-01=/login,TC-02=/signup')
  .option('--tc-ids <ids>', 'comma-separated TC-IDs to capture (subset of plan)')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runVisualBaseline(slug, {
        outDir:   opts.out,
        folder:   opts.folder,
        baseUrl:  opts.baseUrl,
        viewport: opts.viewport,
        urls:     opts.urls,
        tcIds:    opts.tcIds,
        json:     global.json,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 1);
    }
  });

visualCmd
  .command('compare <slug>')
  .description(
    'Compare current screenshots against baseline. ' +
    'Diffs stored at <slug>/visual-diff/<TC-ID>-diff.png. ' +
    'Threshold configurable in branchnux.config.mjs (default 5%). ' +
    'Optional: npm install --save-dev pixelmatch pngjs for pixel diff.',
  )
  .option('--strict', 'exit 2 if any TC exceeds the diff threshold')
  .option('--report', 'flag-only mode — no exit code change on diff (default)')
  .option('--threshold <n>', 'override diffThreshold for this run (0.0–1.0)', parseFloat)
  .option('--out <dir>', 'testing-log root (default: ./testing-log/)', './testing-log')
  .option('--folder <path>', 'explicit path to test-pass folder (overrides slug search)')
  .option('--base-url <url>', 'base URL of the running application', 'http://localhost:3000')
  .option('--viewport <WxH>', 'viewport size as WIDTHxHEIGHT (default: 1280x800)', '1280x800')
  .option('--urls <pairs>', 'comma-separated TC-ID=URL pairs, e.g. TC-01=/login,TC-02=/signup')
  .option('--tc-ids <ids>', 'comma-separated TC-IDs to capture (subset of plan)')
  .action(async (slug, opts, cmd) => {
    const global = cmd.parent.parent.opts();
    try {
      await runVisualCompare(slug, {
        strict:    opts.strict ?? false,
        outDir:    opts.out,
        folder:    opts.folder,
        baseUrl:   opts.baseUrl,
        viewport:  opts.viewport,
        urls:      opts.urls,
        tcIds:     opts.tcIds,
        json:      global.json,
        threshold: opts.threshold,
      });
    } catch (err) {
      emit(global.json, { error: err.message });
      process.exit(err.exitCode ?? 2);
    }
  });

// ── DEPRECATION SHIMS (AP-F7) ─────────────────────────────────────────────────
//
// These verbs moved to fruitnux in v0.6. The shims below:
//   1. Print a deprecation warning to stderr
//   2. Forward the call to fruitnux via spawnSync
//
// Shims will be REMOVED in v0.7.0.

// ── rtm (deprecated) ─────────────────────────────────────────────────────────

program
  .command('rtm')
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .description('[DEPRECATED in v0.6] Moved to fruitnux. Use: fruitnux rtm')
  .action((_opts, cmd) => {
    const rawArgs = cmd.args ?? [];
    deprecatedForward('rtm', rawArgs);
  });

// ── sca (deprecated) ─────────────────────────────────────────────────────────

program
  .command('sca [subcommand] [args...]')
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .description('[DEPRECATED in v0.6] Moved to fruitnux. Use: fruitnux sca ...')
  .action((subcommand, args) => {
    const extra = subcommand ? [subcommand, ...args] : args;
    deprecatedForward('sca', extra);
  });

// ── br (deprecated) ───────────────────────────────────────────────────────────

program
  .command('br [subcommand] [args...]')
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .description('[DEPRECATED in v0.6] Moved to fruitnux. Use: fruitnux br ...')
  .action((subcommand, args) => {
    const extra = subcommand ? [subcommand, ...args] : args;
    deprecatedForward('br', extra);
  });

// ── sign (deprecated) ─────────────────────────────────────────────────────────

program
  .command('sign [subcommand] [args...]')
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .description('[DEPRECATED in v0.6] Moved to fruitnux. Use: fruitnux sign ...')
  .action((subcommand, args) => {
    const extra = subcommand ? [subcommand, ...args] : args;
    deprecatedForward('sign', extra);
  });

// ── helpers ──────────────────────────────────────────────────────────────────

function emit(isJson, payload) {
  if (isJson) {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } else if (payload.error) {
    // In non-JSON mode, print errors to stderr so they are visible and catchable
    process.stderr.write(`ERROR: ${payload.error}\n`);
  }
}

// ── parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
