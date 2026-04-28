#!/usr/bin/env node
// leafnux CLI — continuous-internal-health layer of the 6-NUX taxonomy.
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
leafnux v${version}

  Status: SKELETON — DEFERRED to a future sprint.

  This package is reserved in the @leapnux scope but not actively developed.
  Verb scope is intentionally undecided pending real-world signal:
    - cross-check against prior PMO-platform features
    - pull from at least one production adopter
    - clarity on which leaf-layer signals are OSS vs premium (6-NUX hosted)

  Where this fits in 6-NUX:

    leafnux is the CONTINUOUS HEALTH LAYER — observability signals,
    CI/CD gates, dependabot, secrets-scan, performance trends,
    audit-log integrity. The day-to-day vital signs that keep the tree alive.

  Many leaf-layer features may belong to 6-NUX premium (hosted dashboards,
  multi-project rollups, account-bound alerting) rather than the OSS CLI.
  The OSS line is being kept tight.

  See docs/6-NUX.md and docs/MOTTO.md for the OSS/Premium product split.
  Roadmap: https://github.com/StillNotBald/branchnux
`.trim();

console.log(message);
process.exit(0);
