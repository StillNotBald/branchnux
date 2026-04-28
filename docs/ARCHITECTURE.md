# LeapNuX 5-NUX Architecture

> **Audience:** contributors, integrators, security auditors. If you just want to use the CLI, start with the top-level [README](../README.md). If you want the conceptual model, read [docs/6-NUX.md](./6-NUX.md). This file is the *implementation* spec.
>
> **Status as of v0.4.2-alpha.1:** seven workspaces, two active packages (rootnux, trunknux), one shared core (6nux-core), three skeletons (leafnux, fruitnux, branchnux is mature), one meta-package (5nux). 458+ tests. Apache 2.0 single-license. Anchor-not-revenue posture.

---

## Brand and product hierarchy

```
LeapNuX (org / company)             ← leapnux.com
├── 5-NUX (Product 1, OSS)          ← this monorepo, Apache 2.0
│   ├── @leapnux/rootnux            ← intent (specs, ADRs, risks)
│   ├── @leapnux/trunknux           ← build (sprint scaffolding)
│   ├── @leapnux/branchnux          ← verification (test plans, RTM, SCA)
│   ├── @leapnux/leafnux            ← health (planned v0.5)
│   ├── @leapnux/fruitnux           ← deliverables (planned v0.5)
│   ├── @leapnux/6nux-core          ← shared internals
│   └── @leapnux/5nux               ← meta-package
└── 6-NUX (Product 2, premium)      ← future, commercial license
    └── adds soilnux + hosting + onboarding + training + backend + accounts
```

The **NUX suffix** is a 6-NUX-product-family marker. Future LeapNuX products that aren't part of the taxonomy won't carry it. See [docs/MOTTO.md](./MOTTO.md) for the OSS/Premium split rationale.

---

## Monorepo layout

```
github.com/leapnux/5nux/                      ← repo (transferring from StillNotBald/branchnux)
├── package.json                              ← workspace root, private:true
├── package-lock.json                         ← shared
├── LICENSE / NOTICE / SECURITY.md / CLAUDE.md
├── README.md / CHANGELOG.md
├── docs/
│   ├── 6-NUX.md                              ← artifact taxonomy (canonical)
│   ├── ARCHITECTURE.md                       ← this file
│   ├── MOTTO.md                              ← OSS/Premium product split
│   ├── ai-assistant-guide.md                 ← AI integration guide
│   ├── concepts.md / costs.md / etc.         ← reference material
│   └── architecture/                         ← deeper sub-topics
├── packages/
│   ├── 6nux-core/                            → @leapnux/6nux-core
│   ├── rootnux/                              → @leapnux/rootnux
│   ├── trunknux/                             → @leapnux/trunknux
│   ├── branchnux/                            → @leapnux/branchnux
│   ├── leafnux/                              → @leapnux/leafnux  (skeleton)
│   ├── fruitnux/                             → @leapnux/fruitnux (skeleton)
│   └── 5nux/                                 → @leapnux/5nux meta
├── examples/                                 ← cross-package demos
├── requirements/                             ← 5-NUX self-dogfood (root level — applies to whole repo)
├── sprint-log/                               ← 5-NUX self-dogfood
├── testing-log/                              ← 5-NUX self-dogfood
└── sca/                                      ← branchnux's older SCA convention
```

**What lives at root vs inside `packages/branchnux/`:**

- **Root (whole-repo):** LICENSE, README, CHANGELOG, docs/, examples/, .github/, the dogfood folders (requirements/, sprint-log/, testing-log/)
- **`packages/branchnux/`:** branchnux-only code, tests, schemas, templates, scripts

The dogfood folders at root document development of the *whole monorepo*, not branchnux-only. branchnux happens to be the most mature node, so its self-development log lives at the project level.

---

## Package contracts and dependency rules

### Hard rule: NUX packages do NOT import each other

```
       @leapnux/6nux-core
       ↑   ↑   ↑   ↑    ↑
       │   │   │   │    │
   rootnux trunknux branchnux leafnux fruitnux
       ↑   ↑   ↑     ↑          ↑
       └───┴───┴─────┴──────────┘
              │
       @leapnux/5nux (meta)
```

Every NUX package depends on `@leapnux/6nux-core` and **nothing else from the LeapNuX scope**. Cross-package coordination happens at the **file system level** through the conventions encoded in `@leapnux/6nux-core`.

**Why:** lets users install any single NUX package standalone (`npm i -g @leapnux/rootnux`) without dragging the rest. It also avoids cyclic dependency hells as the family grows.

### What `@leapnux/6nux-core` exposes

| Module | Surface | Used by |
|---|---|---|
| `@leapnux/6nux-core/conventions` | `PATHS`, `SCHEMAS`, `KEBAB_RE`, `DATE_SLUG_RE`, `VALID_DATE_RE`, `STATUSES` | rootnux, trunknux, branchnux |
| `@leapnux/6nux-core/ids` | `RXX_PATTERN`, `todayISO()`, `slugify()`, `isValidSlug()` | rootnux, trunknux |
| `@leapnux/6nux-core/utils` | `parseMarkdownFrontmatter()`, `yamlQuote()`, `readFileWithSizeCap()`, `assertDateFormat()` | rootnux, trunknux |
| `@leapnux/6nux-core/schemas` | (placeholder) JSON Schemas for R-XX, ADR, sprint folder, test plan, RTM | future v0.5+ |
| `@leapnux/6nux-core/validators` | (placeholder) high-level validators built on schemas | future v0.5+ |

**Schema versioning is high-stakes.** A change here breaks all downstream NUX packages and the future commercial 6-NUX. Versioned namespaces (`schemas/v1/`, `schemas/v2/`) are the migration path — never break v1 in place.

---

## Distribution: ESM-only, no build step

- Source files are `.mjs` ECMAScript modules. Node 20+ required.
- Published artifact = source. No transpile, no minify, no `dist/`.
- Pros: trivial debugging (stack traces match repo paths), zero build complexity, no source map drift.
- Cons: incompatible with CommonJS consumers. Unimportant for a 2026 OSS CLI tool.

If a consumer ever needs CJS interop, we'll publish dual builds — but not for the alpha line.

---

## Versioning: lockstep across all packages

Every published package shares one version (`0.4.2-alpha.1`, `0.4.3-alpha.1`, ...). Mirrors React, Vue, Vite practice.

**Why lockstep:**
- One answer to "what version of LeapNuX am I on?"
- No compatibility-matrix support burden (rootnux@0.5 + branchnux@0.3 — does that combo work?)
- Atomic releases — every release tag captures the entire taxonomy

**Trade-off:** a single-package patch ships under a version bump that touches all packages. Acceptable while the taxonomy is small.

---

## CLI architecture

Every `@leapnux/*` package that exposes a CLI follows the same pattern:

```
packages/<nux>/
├── bin/<nux>.mjs          ← thin wrapper: imports commands, configures commander, runs
├── src/commands/
│   ├── <verb1>.mjs         ← one file per verb, exports a runVerb() function
│   ├── <verb2>.mjs
│   └── ...
├── test/
│   ├── <verb1>.test.mjs
│   └── ...
├── README.md
└── package.json
```

**bin/** uses `commander` to register verbs and dispatch. Each verb's `run<Verb>()` returns an exit code (or throws); bin handles `process.exit`.

**Why this shape:**
- Each verb is a unit-testable pure function (no `process.exit` baked in)
- Adding a new verb is mechanical: drop a file in `src/commands/`, register in `bin/`
- The CLI surface is greppable — `grep -l 'program.command' packages/*/bin/*.mjs`

---

## Security model

5-NUX is a **local CLI tool** that reads + writes the developer's working directory. It does not maintain state, hold credentials, or call out to network services (beyond `branchnux`'s optional Anthropic API for `plan`).

### Threat model

| Asset | Threat | Mitigation |
|---|---|---|
| Files outside `cwd` (system files) | Path traversal via crafted slug/title | `path.resolve` + `startsWith(allowedDir)` assertion in adr-new |
| Files inside `cwd` | TOCTOU + symlink swap during init | `fs.openSync(path, 'wx')` exclusive create — atomic, can't follow pre-planted symlinks |
| Shell command execution | Command injection via user input | `spawnSync('git', [...args])` array form (never string interpolation). Date inputs validated against `/^\d{4}-\d{2}-\d{2}$/` before use |
| Memory exhaustion | Huge REQUIREMENTS.md / sprint-log floods | `readFileWithSizeCap(path, 10MB)` in lint readers. Folder-iteration cap in trunknux lint |
| Information disclosure | Absolute paths in error logs | Errors echo paths relative to `cwd` |
| Secret leakage | Commit subjects copied into SPRINT_SUMMARY.md | summarize scans for `ghp_`, `AKIA`, `password=` patterns and warns; not blocking |
| ADR overwrite race | Parallel `adr-new` calls land same NNNN | exclusive create — second writer fails clean |
| YAML injection | ADR title with YAML metacharacters | `yamlQuote()` escapes title before embedding in frontmatter |

### What's out of scope

- Network attacks (no listening surfaces)
- Privilege escalation across users (single-user tool)
- Cryptographic guarantees on output (signing is optional, key management is the user's)
- Runtime protection of in-memory state (single-process, short-lived)

If you need stronger guarantees, the future **6-NUX premium** ships with a hosted backend, signed evidence chain, and account-bound access control.

---

## Testing strategy

- **Unit + integration via vitest.** Each verb gets its own test file. Tests use `os.tmpdir()` + `fs.mkdtempSync()` for filesystem isolation.
- **No real Anthropic calls in test.** branchnux's `plan` test mocks `@anthropic-ai/sdk` via `vi.mock`.
- **No real git operations in trunknux unit tests.** trunknux's `summarize` test sets up a tmp git repo per test.
- **Cross-package integration tests** (planned v0.5+) live in `<root>/tests/integration/` to exercise rootnux artifacts → branchnux RTM cross-link checks end-to-end.
- **Test count by package** (current baseline, v0.4.1):
  - branchnux: 370/370
  - rootnux: 43/43
  - trunknux: 45/45
  - 6nux-core: TBD (added in v0.4.2)
  - **Total: 458+ passing.**

### Test discipline rules (operational)

- Date-dependent tests pass an explicit `since` value (e.g. `'2020-01-01'`) — never `today()`. Avoids midnight-rollover flakes.
- Git-commit setup uses `git commit -F <message-file>` (not `-m "..."`) to avoid Windows cmd.exe shell-escape issues with parens in commit subjects.
- All tests clean up via `afterEach` — no shared state between tests.

---

## Extending the taxonomy

### Adding a new verb to an existing NUX package

1. Create `packages/<nux>/src/commands/<verb>.mjs` exporting a `run<Verb>(args, opts)` function returning an exit code.
2. Register it in `packages/<nux>/bin/<nux>.mjs` via `program.command('<verb>').action(...)`.
3. Add `packages/<nux>/test/<verb>.test.mjs` with happy + edge-case tests.
4. Update `packages/<nux>/README.md` with the verb's docs.

### Adding a new NUX package (e.g. `leafnux` going from skeleton → real)

1. Replace `packages/leafnux/bin/leafnux.mjs` skeleton with a real CLI per the pattern above.
2. Add `packages/leafnux/src/commands/` with verb implementations.
3. Add tests.
4. The package already exists in npm-workspaces config and 5nux meta-deps — no root changes needed.

### Adding new shared utilities to `@leapnux/6nux-core`

1. Add to the relevant module under `packages/6nux-core/src/`.
2. Export from `packages/6nux-core/src/index.mjs`.
3. Add tests in `packages/6nux-core/test/`.
4. **High caution:** schema/contract changes break consumers. Use versioned namespaces if breaking.

---

## Self-dogfood

5-NUX is built using its own tools. Concrete evidence:

- `sprint-log/<date>_v0-4-1-rootnux-trunknux-mvp/` was created via `trunknux new-sprint`.
- `sprint-log/<date>_v0-4-1-rootnux-trunknux-mvp/SPRINT_SUMMARY.md` was generated via `trunknux summarize` from 32 git commits.
- `requirements/risks/risks.md` was scaffolded by `rootnux init` (idempotent against existing branchnux artifacts).
- ADRs (when added) will be scaffolded by `rootnux adr-new`.

The dogfood discipline is **load-bearing for credibility**. Every time we ship a new verb, we use it on this monorepo first.

---

## Roadmap

| Version | Scope | Status |
|---|---|---|
| v0.4.0-alpha.1 | Monorepo migration | shipped 2026-04-28 |
| v0.4.1-alpha.1 | rootnux + trunknux MVPs + 1 CRITICAL + 9 HIGH hardening + motto lock | shipped 2026-04-28 |
| v0.4.2-alpha.1 | 6nux-core extraction + 8 MEDIUM/LOW polish + ARCHITECTURE.md | shipped 2026-04-28 |
| v0.4.3-alpha.1 | leafnux+fruitnux deferral formalized | shipped 2026-04-28 |
| v0.5+ | 5 ports identified, scoped from production-PM-tool feedback | scoped, not started |
| v1.0.0 | Stability + leapnux.com landing page + 6-NUX commercial spec | planned |

### v0.5+ candidate verbs (ranked)

| # | Port | Package | Effort |
|---|---|---|---|
| 1 | `trunknux log` — weekly narrative log | trunknux | S |
| 2 | `rootnux kb-init` — knowledge base scaffold | rootnux | S |
| 3 | `leafnux health` — RAG status + transition linter (un-defers leafnux with concrete value) | leafnux | S |
| 4 | `branchnux gate-new` — gate checkpoint artifact | branchnux | M |
| 5 | `leafnux critical-path` — CPM dependency analysis | leafnux | M |

**Note on leafnux + fruitnux:** the skeleton packages remain reserved. Two concrete `leafnux` verbs are scoped (`health` and `critical-path`) — both originate from pure-logic patterns proven in production PM tooling. fruitnux remains deferred indefinitely; branchnux already covers the OSS-CLI portion of audit evidence (`sca`, `sca-oscal`, `sign`, `sign-pdf`), and most other deliverable workflows (multi-party sign-off, immutable evidence stores, regulator portals) are inherently 6-NUX premium.

### Anti-patterns to avoid (lessons from prior PM-platform work)

- Interactive visual Gantt chart (data model is the value, not the bars)
- Slide / PPTX export (anticipatory library that never wires to a workflow)
- In-memory bulletin / announcement board (infrastructure for a static string)
- Live-clock projection / war-room TV dashboard view (narrow-audience theatre)
- Frontend stub permission service that always returns `true` (avoiding a refactor by lying in code)

---

## Decision history

The big architectural decisions, in order:

1. **Brand split** (LeapNuX = org, 5-NUX = OSS product, 6-NUX = premium) — locked 2026-04-27 evening
2. **Apache 2.0 single license** for 5-NUX (rejected dual license; anchor-not-revenue means maximum adoption matters more than monetization optionality) — locked 2026-04-28
3. **Monorepo with npm workspaces** (rejected polyrepo, rejected Turborepo/Nx as overkill) — locked 2026-04-28
4. **Lockstep versioning** (rejected independent per-package versioning) — locked 2026-04-28
5. **ESM-only `.mjs` source as published artifact** (rejected TypeScript build pipeline) — locked 2026-04-28
6. **File-system convention contract** (rejected NUX-to-NUX cross-imports) — locked 2026-04-28
7. **Motto: OSS = entire PM tool chain in CLI; Premium = onboarding/training/hosting/backend/accounts** — locked 2026-04-28

These are not up for re-litigation without strong new evidence.

---

*This document evolves with the taxonomy. Update on every architectural change. Last edit: 2026-04-28.*
