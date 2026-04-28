# 5-NUX

> The entire PM tool chain in your CLI: requirement → sprint → test → validation → ship.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node: >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Tests: 528 passing](https://img.shields.io/badge/tests-528%20passing-brightgreen.svg)]()
[![Version: v0.4.3-alpha.1](https://img.shields.io/badge/version-v0.4.3--alpha.1-orange.svg)](CHANGELOG.md)

## What this is

5-NUX is the OSS anchor product for the **LeapNuX** methodology. It is a 7-package npm-workspaces monorepo — one CLI per node of the 6-NUX taxonomy (root, trunk, branch, leaf, fruit) plus a shared core library and a meta-package that installs the full stack. The taxonomy maps directly to the regulated-software lifecycle: you state your requirements, plan your sprints, verify your branches, monitor health, and ship audit-ready deliverables — all from the CLI, all in your repo.

The intended audience is engineering and QA leads at regulated-software teams who need a defensible audit-evidence trail (test plans → RTM → SCA → OSCAL) but do not want to pay for a hosted SaaS or cede control of their evidence to a vendor. Every artifact 5-NUX produces is a plain-format file (Markdown, XLSX, HTML, PDF, JSON) that lives in your git repo and can be read by auditors without installing anything.

Apache 2.0, ESM-only, Node 20+. This is the anchor, not the revenue product. Premium features — hosting, multi-user workflows, managed accounts, the full 6-NUX commercial spec — belong in the future commercial tier. See [`docs/MOTTO.md`](docs/MOTTO.md) for the OSS/Premium split.

---

## The 7 packages

| Package | Layer | Status | Verbs |
|---|---|---|---|
| `@leapnux/rootnux` | intent (specs, ADRs, risks) | active | `init`, `lint`, `adr-new`, `risk-add`, `status` |
| `@leapnux/trunknux` | build (sprint scaffolding) | active | `new-sprint`, `summarize`, `lint` |
| `@leapnux/branchnux` | verification (test plans, RTM, SCA) | active | `init`, `plan`, `codify`, `report`, `validate`, `sca`, `sca-oscal`, `rtm`, `sign`, `sign-pdf`, `visual`, `discover`, `enrich`, `br`, `doctor` (15+ verbs) |
| `@leapnux/leafnux` | continuous health | deferred skeleton | (see roadmap) |
| `@leapnux/fruitnux` | external deliverables | deferred skeleton | (see roadmap) |
| `@leapnux/6nux-core` | shared library | active | (no CLI; shared schemas, conventions, IDs, utils) |
| `@leapnux/5nux` | meta-package | active | (no CLI; installs all 5 NUX packages) |

---

## Install

**Full stack (all 5 NUX packages):**

```sh
npm install -g @leapnux/5nux
```

**Just one node:**

```sh
npm install -g @leapnux/rootnux
npm install -g @leapnux/trunknux
npm install -g @leapnux/branchnux
```

> Note: `@leapnux/*` packages are not yet published to npm — org claim and scope reservation are pending.
> For now, clone this repo and run via the package binaries from the workspace root.

---

## Quick tour

### State your requirements

```sh
rootnux init
```

Scaffolds `REQUIREMENTS.md`, `TRACEABILITY.md`, a risks register, and `docs/adr/`.

### Record an architectural decision

```sh
rootnux adr-new "Use PostgreSQL for primary store"
```

Creates `docs/adr/0001-use-postgresql-for-primary-store.md` with sequential numbering.

### Start a sprint

```sh
trunknux new-sprint v1-launch
```

Creates `sprint-log/2026-04-28_v1-launch/` with a sprint scaffold.

### Summarize what was built

```sh
trunknux summarize
```

Generates `SPRINT_SUMMARY.md` from `git log`, grouped by conventional-commit type.

### Generate a test plan

```sh
branchnux plan login
```

Produces `testing-log/<date>_login/test-plan.md` with TC matrix, Given/When/Then per TC, R-ID frontmatter, and `[VERIFY]` markers on every LLM-drafted cell.

### Produce a Security Control Assessment

```sh
branchnux sca login
```

Produces an 8-section SCA document (Markdown + optional PDF) for the login surface.

---

## How it fits together

The 6-NUX taxonomy is a directed graph of concerns in the regulated-software lifecycle:

```
rootnux (intent / specs)
    └── trunknux (build / sprint)
            └── branchnux (verification / evidence)
                    ├── leafnux (continuous health) [deferred]
                    └── fruitnux (audit deliverables) [deferred]
```

**Cross-package contract:** NUX packages do not import each other. They communicate via file-system conventions defined in `@leapnux/6nux-core`. A rootnux artifact (e.g. `REQUIREMENTS.md`) is a file that trunknux and branchnux read by path — not by API call. This keeps the packages independently installable and avoids coupling the release cycles.

See [`docs/6-NUX.md`](docs/6-NUX.md) for the full taxonomy schema and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the implementation spec.

---

## Why branchnux?

BranchNuX is the most mature node in the tree. A few design decisions worth knowing before you adopt it:

- **Three-track discipline.** `requirements/` (what you said you'd build) + `sprint-log/` (what was built) + `testing-log/` (what was tested). One traceable graph, all in your repo, date-stamped for audit snapshots.
- **`[VERIFY]` markers on every LLM-drafted cell.** Explicit annotation that no human has attested the content yet. AI accelerates authoring; humans gate evidence. Removing a `[VERIFY]` without reading the underlying content is the one way to make your evidence package fail under audit.
- **HMAC-chained signoff ledger.** Tamper-evident attestation. The signoff PDF carries a hash-chain verification badge that auditors can verify independently of the tool.
- **Deterministic core, opt-in AI.** `branchnux report`, `validate`, `rtm`, `sca`, and the signoff suite require no LLM. The Claude API (`discover`, `plan`, `codify`, `enrich`) is opt-in with explicit cost gates (`--max-spend`, `--dry-run`).
- **Audience split.** Most branchnux users never run the CLI — they read the HTML report, XLSX, signed PDF, or OSCAL JSON that the CLI produced. The artifact formats (HTML, Excel, PDF, JSON, Markdown) were chosen so compliance officers, legal counsel, and external auditors can open them without installing anything.

---

## Documentation

- [`docs/MOTTO.md`](docs/MOTTO.md) — OSS / Premium product split and strategic posture
- [`docs/6-NUX.md`](docs/6-NUX.md) — taxonomy schema
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — monorepo implementation spec
- [`docs/concepts.md`](docs/concepts.md) — key concepts (three-track discipline, VERIFY markers, HMAC chain)
- [`docs/getting-started.md`](docs/getting-started.md) — first 15 minutes
- [`docs/reference.md`](docs/reference.md) — full verb reference
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute

---

## Roadmap

- **v0.4.x** — current alpha series; rootnux + trunknux + branchnux mature; leafnux + fruitnux remain reserved skeletons with no committed timeline
- **v0.5+** — leafnux + fruitnux verbs (deferred pending real adopter pull and OSS-vs-premium clarity)
- **v1.0** — stability milestone + landing page at leapnux.com + 6-NUX commercial spec

If you want the roadmap to prioritize a specific artifact type, [open an issue](https://github.com/StillNotBald/branchnux/issues).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

Quick version: sign commits with `git commit -s` (DCO, no CLA), ship tests with every PR, open an issue before a large change.

---

## License

Apache 2.0. See [LICENSE](LICENSE).

"BranchNuX™" and "LeapNuX™" are trademarks of Chu Ling. See [NOTICE](NOTICE) for trademark terms. The Apache 2.0 license covers the code; the trademark covers the name.

## Author

Chu Ling ([StillNotBald](https://github.com/StillNotBald)) — ccling1998@gmail.com

Security reports: [GitHub Private Vulnerability Reporting](https://github.com/StillNotBald/branchnux/security/advisories/new) (preferred) or email.
