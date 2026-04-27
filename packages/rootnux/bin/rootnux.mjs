#!/usr/bin/env node
// rootnux CLI — intent-layer of the 6-NUX taxonomy.
// v0.4.0-alpha.1: skeleton package. Verbs ship in v0.4.1.

const VERSION = '0.4.0-alpha.1';

const message = `
rootnux v${VERSION}

  Status: SKELETON — package reserved, verbs not yet implemented.
  Planned for v0.4.1:

    rootnux init             scaffold requirements/REQUIREMENTS.md + TRACEABILITY.md
    rootnux lint             validate R-XX schema + cross-links
    rootnux adr-new <title>  scaffold a new ADR with sequential numbering
    rootnux risk-add         append to risk register
    rootnux status           show DONE/BLOCKED/DECLINED/DEFERRED counts

  Where this fits in 6-NUX:

    rootnux is the INTENT LAYER — specs, decisions, governance.
    See docs/6-NUX.md and project_5nux_product_plan for the full taxonomy.

  Roadmap: https://github.com/StillNotBald/branchnux (repo will move to
  github.com/leapnux/5nux when the leapnux org is claimed).
`.trim();

console.log(message);
process.exit(0);
