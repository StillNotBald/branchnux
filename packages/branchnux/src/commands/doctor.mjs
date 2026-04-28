// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/doctor.mjs
 *
 * Implements `branchnux doctor`.
 *
 * Runs preflight checks and emits ✅/⚠️/❌ per check with an actionable message.
 *
 * Checks (generic — always run):
 *   1. node        — Node.js version >= 20
 *   2. playwright  — Playwright browsers installed (dry-run detection)
 *   3. env         — Config-driven env var checks via branchnux.config.mjs
 *                    { env: { required: ['VAR1'], recommended: ['VAR2'] } }
 *                    If no config file is present, env check is skipped.
 *   4. build       — Detect if a `npm run dev` process is running on port 3000 and warn that
 *                    Playwright must run against `npm run build && npm start` (prod build)
 *   5. conventions — Check that testing-log/ and requirements/ folders exist in CWD
 *
 * Opt-in checks (require --check <name>):
 *   supabase       — MFA Enroll vs Verify toggle mismatch (requires SUPABASE_MANAGEMENT_TOKEN +
 *                    --project-ref flag). Run with: branchnux doctor --check supabase
 *                    This check was previously part of the default run but was FirstLeap-specific
 *                    (AP-F4, audit ref: docs/audit/2026-04-28/SYNTHESIS-5nux.md).
 *
 * Config-driven env checks (AP-F4):
 *   Create branchnux.config.mjs in your project root:
 *
 *     export default {
 *       env: {
 *         required: ['DATABASE_URL', 'API_KEY'],
 *         recommended: ['LOG_LEVEL', 'SENTRY_DSN'],
 *       },
 *     };
 *
 *   - required: any missing var is reported as an error
 *   - recommended: any missing var is reported as a warning
 *   If branchnux.config.mjs is absent, env checks are skipped entirely.
 *
 * Exit codes:
 *   0  all checks green (or only non-fatal warnings)
 *   1  one or more critical checks failed (❌)
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ check?: string, projectRef?: string, json: boolean }} opts
 */
export async function runDoctor(opts = {}) {
  const { check, projectRef, json = false } = opts;

  // Load branchnux.config.mjs from cwd if present (AP-F4)
  const doctorCfg = await _loadDoctorConfig();

  const results = [];
  let hasErrors = false;

  const runCheck = async (name, fn) => {
    if (check && check !== name) return; // filtered by --check flag
    try {
      const result = await fn();
      results.push({ name, ...result });
      if (result.level === 'error') hasErrors = true;
    } catch (err) {
      results.push({ name, level: 'error', message: `Check threw: ${err.message}` });
      hasErrors = true;
    }
  };

  // Generic checks — always run (unless filtered by --check)
  await runCheck('node', checkNode);
  await runCheck('playwright', checkPlaywright);
  await runCheck('env', () => checkEnv(doctorCfg));
  await runCheck('build', checkBuild);
  await runCheck('conventions', checkConventions);

  // Opt-in checks — only run when explicitly requested via --check <name>
  // Default `branchnux doctor` (no --check flag) does NOT run these.
  // Supabase check is FirstLeap-specific; other projects should use --check supabase only
  // if they rely on Supabase MFA (AP-F4).
  if (check === 'supabase') {
    await runCheck('supabase', () => checkSupabase(projectRef));
  }

  // ── Output ─────────────────────────────────────────────────────────────────

  if (json) {
    process.stdout.write(
      JSON.stringify({
        event: 'doctor.result',
        checks: results,
        passed: !hasErrors,
      }) + '\n',
    );
  } else {
    console.log('');
    console.log('BranchNuX — Doctor');
    console.log('═'.repeat(50));
    for (const r of results) {
      const icon = r.level === 'ok' ? '✅' : r.level === 'warn' ? '⚠️ ' : '❌';
      console.log(`${icon}  [${r.name}] ${r.message}`);
      if (r.detail) console.log(`       ${r.detail}`);
      if (r.fix) console.log(`   FIX: ${r.fix}`);
    }
    console.log('═'.repeat(50));
    const errorCount = results.filter((r) => r.level === 'error').length;
    const warnCount = results.filter((r) => r.level === 'warn').length;
    if (errorCount === 0 && warnCount === 0) {
      console.log('All checks passed. You are good to go.');
    } else {
      console.log(
        `${errorCount} error(s), ${warnCount} warning(s). Fix errors before running tests.`,
      );
    }
    console.log('');
  }

  if (hasErrors) {
    const err = new Error('Doctor found critical issues — see output above');
    err.exitCode = 1;
    throw err;
  }
}

// ── Config loader ─────────────────────────────────────────────────────────────

/**
 * Attempt to load branchnux.config.mjs from process.cwd().
 *
 * AP-F4 (audit ref: docs/audit/2026-04-28/SYNTHESIS-5nux.md):
 * Env-var checks are now project-configurable via this file, eliminating the
 * previous hardcoded FirstLeap-specific vars (SITE_GATE_PIN, SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MANAGEMENT_TOKEN).
 *
 * Schema:
 *   export default {
 *     env: {
 *       required: ['VAR1'],      // missing → error
 *       recommended: ['VAR2'],   // missing → warning
 *     },
 *   };
 *
 * @returns {{ env?: { required?: string[], recommended?: string[] } } | null}
 *   Parsed config object, or null if no config file found.
 */
async function _loadDoctorConfig() {
  const configPath = path.join(process.cwd(), 'branchnux.config.mjs');
  if (!fs.existsSync(configPath)) return null;
  try {
    // Use pathToFileURL to handle Windows absolute paths (ESM import requires
    // file:// URLs on Windows; bare absolute paths with drive letters fail).
    const mod = await import(pathToFileURL(configPath).href);
    return mod.default ?? null;
  } catch {
    // Config load failure → treat as no config (don't abort doctor run)
    return null;
  }
}

// ── Individual checks ────────────────────────────────────────────────────────

function checkNode() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) {
    return {
      level: 'error',
      message: `Node.js ${process.versions.node} is below the required minimum (20.x)`,
      fix: 'Upgrade Node.js: https://nodejs.org — recommended: use nvm or fnm for version management',
    };
  }
  return { level: 'ok', message: `Node.js ${process.versions.node} — OK` };
}

function checkPlaywright() {
  // Playwright marks browsers as installed by writing a .local-browsers/ folder
  // The --dry-run flag is not standard; instead we check for the browsers directory
  // by running `npx playwright install --dry-run` which exits 0 if browsers present.
  try {
    const result = spawnSync(
      'npx',
      ['playwright', 'install', '--dry-run'],
      { encoding: 'utf-8', timeout: 10_000 },
    );
    // If all browsers are already installed the output contains "already installed"
    // or the exit code is 0 with no "Downloading" lines.
    const stdout = result.stdout ?? '';
    const needsDownload = stdout.includes('Downloading') || result.status !== 0;
    if (needsDownload) {
      return {
        level: 'warn',
        message: 'Playwright browsers appear to need installation',
        fix: 'Run: npx playwright install chromium',
      };
    }
    return { level: 'ok', message: 'Playwright browsers installed' };
  } catch {
    return {
      level: 'warn',
      message: 'Could not verify Playwright browser installation (npx playwright not found?)',
      fix: 'Run: npm install --save-dev @playwright/test && npx playwright install chromium',
    };
  }
}

/**
 * Config-driven env check (AP-F4).
 *
 * When a branchnux.config.mjs is present and exports an `env` section, this
 * function checks:
 *   - env.required  → missing var = error
 *   - env.recommended → missing var = warning
 *
 * When no config is present, the check is skipped (returns ok).
 * This replaces the previous hardcoded FirstLeap-specific checks for
 * SITE_GATE_PIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * @param {{ env?: { required?: string[], recommended?: string[] } } | null} cfg
 */
function checkEnv(cfg) {
  if (!cfg || !cfg.env) {
    return {
      level: 'ok',
      message: 'Env check skipped — no branchnux.config.mjs found in CWD',
      detail:
        'Create branchnux.config.mjs with { env: { required: [...], recommended: [...] } } ' +
        'to enable project-specific env checks.',
    };
  }

  const required = Array.isArray(cfg.env.required) ? cfg.env.required : [];
  const recommended = Array.isArray(cfg.env.recommended) ? cfg.env.recommended : [];

  const errors = [];
  const warnings = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`${varName} is required but not set`);
    }
  }

  for (const varName of recommended) {
    if (!process.env[varName]) {
      warnings.push(`${varName} is recommended but not set`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    return {
      level: 'ok',
      message: `Env check passed — all ${required.length} required, ${recommended.length} recommended vars present`,
    };
  }

  if (errors.length > 0) {
    return {
      level: 'error',
      message: `${errors.length} required env var(s) missing`,
      detail: [...errors, ...warnings].join(' | '),
      fix: 'Set the missing required environment variables before running tests',
    };
  }

  return {
    level: 'warn',
    message: `${warnings.length} recommended env var(s) missing`,
    detail: warnings.join(' | '),
    fix: 'Consider setting the recommended environment variables',
  };
}

/**
 * Supabase MFA check — opt-in via --check supabase (AP-F4).
 *
 * Previously ran in the default doctor pass, which made it FirstLeap-specific.
 * Now only runs when explicitly requested: branchnux doctor --check supabase
 *
 * Checks MFA Enroll vs Verify toggle mismatch (Supabase TOTP Enroll/Verify are
 * separate flags; the Dashboard may only expose Verify). Requires:
 *   - SUPABASE_MANAGEMENT_TOKEN env var (sbp_* token, 50+ chars)
 *   - --project-ref <ref> CLI flag
 */
async function checkSupabase(projectRef) {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN;

  if (!token) {
    if (projectRef) {
      return {
        level: 'warn',
        message: '--project-ref provided but SUPABASE_MANAGEMENT_TOKEN env var not set',
        fix: 'Set SUPABASE_MANAGEMENT_TOKEN to your sbp_* management API token and re-run',
      };
    }
    return {
      level: 'ok',
      message: 'Supabase MFA check skipped — no SUPABASE_MANAGEMENT_TOKEN in env',
      detail: 'Pass --project-ref <ref> with SUPABASE_MANAGEMENT_TOKEN set to enable this check',
    };
  }

  if (!projectRef) {
    return {
      level: 'warn',
      message: 'SUPABASE_MANAGEMENT_TOKEN is set but --project-ref is not provided',
      fix: 'Re-run with: branchnux doctor --check supabase --project-ref <your-project-ref>',
    };
  }

  // Fetch auth config from Supabase Management API
  let config;
  try {
    const resp = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!resp.ok) {
      return {
        level: 'error',
        message: `Supabase Management API returned ${resp.status} for project "${projectRef}"`,
        fix: 'Verify SUPABASE_MANAGEMENT_TOKEN is valid and project ref is correct',
      };
    }
    config = await resp.json();
  } catch (err) {
    return {
      level: 'error',
      message: `Failed to reach Supabase Management API: ${err.message}`,
      fix: 'Check network connectivity and token validity',
    };
  }

  const enrollEnabled = config.mfa_totp_enroll_enabled;
  const verifyEnabled = config.mfa_totp_verify_enabled;

  // The critical lesson: Supabase Dashboard sometimes only exposes the Verify toggle.
  // Enroll and Verify are SEPARATE flags. If Enroll=false but Verify=true, users with
  // existing factors can still log in but NEW factors cannot be enrolled — seed scripts
  // will silently fail to create totp-user without an error that says "MFA disabled".
  if (enrollEnabled === false && verifyEnabled === true) {
    return {
      level: 'error',
      message:
        `TOTP Enroll is OFF but Verify is ON for project "${projectRef}". ` +
        'Seed scripts will silently fail to enroll new test factors.',
      detail:
        'Root cause: Supabase Dashboard may only show the Verify toggle. ' +
        'Enroll is a separate flag — disabling Enroll while Verify is on prevents new factor enrollment without raising an error.',
      fix:
        `curl -X PATCH https://api.supabase.com/v1/projects/${projectRef}/config/auth ` +
        `-H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" ` +
        `-H "Content-Type: application/json" ` +
        `-d '{"mfa_totp_enroll_enabled": true}'`,
    };
  }

  if (enrollEnabled === false && verifyEnabled === false) {
    return {
      level: 'warn',
      message: `Both TOTP Enroll AND Verify are OFF for project "${projectRef}"`,
      detail: 'MFA-dependent TCs will be BLOCKED-CONFIG until both are enabled.',
      fix:
        `curl -X PATCH https://api.supabase.com/v1/projects/${projectRef}/config/auth ` +
        `-H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" ` +
        `-H "Content-Type: application/json" ` +
        `-d '{"mfa_totp_enroll_enabled": true, "mfa_totp_verify_enabled": true}'`,
    };
  }

  if (enrollEnabled === true && verifyEnabled === false) {
    return {
      level: 'error',
      message:
        `TOTP Enroll is ON but Verify is OFF for project "${projectRef}". ` +
        'Users can enroll factors but cannot complete login with them — all MFA logins will fail.',
      fix:
        `curl -X PATCH https://api.supabase.com/v1/projects/${projectRef}/config/auth ` +
        `-H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" ` +
        `-H "Content-Type: application/json" ` +
        `-d '{"mfa_totp_verify_enabled": true}'`,
    };
  }

  return {
    level: 'ok',
    message: `TOTP Enroll=true, Verify=true for project "${projectRef}" — MFA config looks healthy`,
  };
}

async function checkBuild() {
  // Detect if a dev server is running on port 3000 — warn if so, since
  // Playwright must run against `npm run build && npm start`, NOT dev.
  // Hydration race in dev mode causes form.requestSubmit() to fall through.
  try {
    const resp = await fetch('http://localhost:3000', {
      signal: AbortSignal.timeout(2000),
    });
    // Look for X-Powered-By: Next.js headers and check if it's a dev server
    // Dev server returns headers like `x-nextjs-cache: MISS` or includes
    // "webpack-hmr" in the HTML. Prod build does not.
    const text = await resp.text().catch(() => '');
    const isDev = text.includes('webpack-hmr') || text.includes('__NEXT_HMR');
    if (isDev) {
      return {
        level: 'warn',
        message: 'Dev server detected on http://localhost:3000',
        detail:
          'Playwright form.requestSubmit() breaks with Next.js dev hydration race — ' +
          'tests will produce false 500s and stuck-at-/login failures.',
        fix: 'Stop the dev server. Run: npm run build && npm start',
      };
    }
    return {
      level: 'ok',
      message: 'Server on http://localhost:3000 looks like a production build',
    };
  } catch {
    return {
      level: 'ok',
      message: 'No server on http://localhost:3000 — start the prod build before running tests',
      detail: 'Run: npm run build && npm start (in your app directory)',
    };
  }
}

function checkConventions() {
  const cwd = process.cwd();
  const missing = [];

  for (const dir of ['testing-log', 'requirements']) {
    if (!fs.existsSync(path.join(cwd, dir))) {
      missing.push(dir);
    }
  }

  if (missing.length === 0) {
    return {
      level: 'ok',
      message: 'Convention folders present: testing-log/, requirements/',
    };
  }

  return {
    level: 'warn',
    message: `Convention folder(s) missing: ${missing.join(', ')}`,
    detail:
      'BranchNuX expects three discipline tracks: requirements/, sprint-log/, testing-log/. ' +
      'See README for the three-track pattern.',
    fix: `mkdir -p ${missing.map((d) => path.join(cwd, d)).join(' ')}`,
  };
}
