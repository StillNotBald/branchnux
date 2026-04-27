#!/usr/bin/env node
// fruitnux CLI — external-deliverables layer of the 6-NUX taxonomy.
// v0.4.0-alpha.1: skeleton. Planned for v0.5.0.

const VERSION = '0.4.0-alpha.1';

const message = `
fruitnux v${VERSION}

  Status: SKELETON — verbs planned for v0.5.0.

  Where this fits in 6-NUX:

    fruitnux is the EXTERNAL DELIVERABLES LAYER — SCAs, pen-test reports,
    SOC 2 packets, regulator-facing PDFs, sign-off packages.
    The harvest the tree exists to produce.

  See docs/6-NUX.md and project_5nux_product_plan for the full taxonomy.
  Roadmap: https://github.com/StillNotBald/branchnux
`.trim();

console.log(message);
process.exit(0);
