#!/usr/bin/env node
// leafnux CLI — continuous-internal-health layer of the 6-NUX taxonomy.
// v0.4.0-alpha.1: skeleton. Planned for v0.5.0.

const VERSION = '0.4.0-alpha.1';

const message = `
leafnux v${VERSION}

  Status: SKELETON — verbs planned for v0.5.0.

  Where this fits in 6-NUX:

    leafnux is the CONTINUOUS HEALTH LAYER — observability signals,
    CI/CD gates, dependabot, secrets-scan, performance trends, audit-log integrity.
    The day-to-day vital signs that keep the tree alive.

  See docs/6-NUX.md and project_5nux_product_plan for the full taxonomy.
  Roadmap: https://github.com/StillNotBald/branchnux
`.trim();

console.log(message);
process.exit(0);
