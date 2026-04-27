// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/commands/risk-add.mjs
 *
 * Implements `rootnux risk-add`.
 *
 * Appends a templated row to requirements/risks/risks.md.
 * Auto-increments Risk ID by scanning existing rows for R-NN patterns.
 *
 * Exit codes:
 *   0 — row appended
 *   2 — risks.md does not exist (run rootnux init first)
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ cwd?: string }} opts
 * @returns {Promise<number>} exit code
 */
export async function runRiskAdd(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const risksPath = path.join(cwd, 'requirements', 'risks', 'risks.md');

  // ── Existence check ───────────────────────────────────────────────────────

  if (!fs.existsSync(risksPath)) {
    console.error('ERROR: requirements/risks/risks.md not found.');
    console.error('       Run `rootnux init` first to scaffold the risk register.');
    return 2;
  }

  // ── Determine next Risk ID ────────────────────────────────────────────────

  const content = fs.readFileSync(risksPath, 'utf-8');
  const riskIdMatches = [...content.matchAll(/\bR-(\d+)\b/g)];

  let highest = 0;
  for (const m of riskIdMatches) {
    const num = parseInt(m[1], 10);
    if (num > highest) highest = num;
  }

  const next = highest + 1;
  const riskId = `R-${String(next).padStart(2, '0')}`;

  // ── Build new row ─────────────────────────────────────────────────────────

  const newRow = `| ${riskId} | <DOMAIN> | <RISK DESCRIPTION> | MED | OPEN |`;

  // ── Append to file ────────────────────────────────────────────────────────

  // Ensure file ends with a newline before appending
  const sep = content.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(risksPath, `${sep}${newRow}\n`, 'utf-8');

  console.log(`Appended: ${newRow}`);
  console.log('');
  console.log('Edit requirements/risks/risks.md to fill in details.');

  return 0;
}
