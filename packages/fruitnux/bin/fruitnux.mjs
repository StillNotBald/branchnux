#!/usr/bin/env node
// fruitnux CLI — external-deliverables layer of the 6-NUX taxonomy.
// v0.4.2-alpha.1: skeleton. DEFERRED to a future sprint (no committed timeline).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let version = '0.4.2-alpha.1';
try {
  version = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version ?? version;
} catch {
  // package.json not present — use default
}

const message = `
fruitnux v${version}

  Status: SKELETON — DEFERRED to a future sprint.

  This package is reserved in the @leapnux scope but not actively developed.
  branchnux already covers the OSS-CLI portion of audit-evidence
  generation (sca, sca-oscal, rtm, sign, sign-pdf). fruitnux's separate
  scope is intentionally undecided pending:
    - input from real adopters running 5-NUX in production
    - clarity on which deliverable-layer features belong to OSS vs
      6-NUX premium (regulator-facing portals, signed evidence chains
      with account-bound access, hosted attestation workflows)
    - pull from at least one production adopter

  Where this fits in 6-NUX:

    fruitnux is the EXTERNAL DELIVERABLES LAYER — SCAs, pen-test reports,
    SOC 2 packets, regulator-facing PDFs, sign-off packages, KPI exports.
    What outsiders consume — auditors, regulators, customers, investors.

  Many deliverable workflows (sign-offs requiring multi-party auth,
  immutable evidence stores, regulator-facing portals) are inherently
  premium territory; OSS will likely never grow them.

  See docs/6-NUX.md and docs/MOTTO.md for the OSS/Premium product split.
  Roadmap: https://github.com/StillNotBald/branchnux
`.trim();

console.log(message);
process.exit(0);
