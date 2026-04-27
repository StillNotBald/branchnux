#!/usr/bin/env node
// trunknux CLI — build-layer of the 6-NUX taxonomy.
// v0.4.0-alpha.1: skeleton package. Verbs ship in v0.4.2.

const VERSION = '0.4.0-alpha.1';

const message = `
trunknux v${VERSION}

  Status: SKELETON — package reserved, verbs not yet implemented.
  Planned for v0.4.2:

    trunknux new-sprint <slug>   create date-prefixed sprint-log/<date>_<slug>/ folder
    trunknux summarize           generate SPRINT_SUMMARY.md from git log
    trunknux lint                verify sprint folder structure conventions

  Where this fits in 6-NUX:

    trunknux is the BUILD LAYER — sprint-log, build artifacts, what was grown.
    See docs/6-NUX.md and project_5nux_product_plan for the full taxonomy.

  Roadmap: https://github.com/StillNotBald/branchnux (repo will move to
  github.com/leapnux/5nux when the leapnux org is claimed).
`.trim();

console.log(message);
process.exit(0);
