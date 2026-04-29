# 6-NUX — Artifact Taxonomy

> **What this is:** the canonical taxonomy for product artifacts in the LeapNuX shipping methodology. Six nodes, modeled as a tree, mapping the full lifecycle from intent to attestation.
>
> **What this is NOT:** a workflow taxonomy. The toolchain (gstack, gbrain, multi-agent, project memory) is *outside* 6-NUX — the gardener's tools, not the tree.
>
> **Companion:** `docs/SHIPPING_SUITE.md` is the playbook (how to ship). This file is the schema (what the artifacts are).
>
> **Status as of 2026-04-27:** stress-tested against 102 product requirements + 74 backlog items. Every item finds at least one home. ~30% legitimately span 2-3 nodes; that's the cross-cutting pattern documented below, not a flaw.

---

## TL;DR

| Node | Plain English | OSS status |
|---|---|---|
| **rootnux** | Why the product is what it is — specs, decisions, governance | active OSS |
| **trunknux** | What was built — sprint-log, code, design system applied | active OSS |
| **branchnux** | How we verify — testing-log, test plans, reports, LLM-assisted planning | active OSS (~14 verbs; audit deliverables moved to fruitnux in v0.6) |
| **leafnux** | Continuous internal health — observability, security gates, perf trends | active OSS (`health` verb in v0.5.0) |
| **fruitnux** | What we hand to outsiders — SCAs, audit packages, sign-off packets | active OSS (AP-F7, v0.6): `sca`, `sca oscal`, `sign`, `sign pdf`, `sign stale-check`, `br`, `rtm` (11 verbs) |
| **soilnux** | What the tree grows in — infra, vendors, runtime ops | **premium** — 6-NUX commercial product |

Connecting tissue: **RTM** (`requirements/TRACEABILITY.md`) — the cambium that wires nodes together.

Out of scope: toolchain, project memory, AI orchestration — these are how the *gardener* tends the tree.

---

## Why six (and why these six)

Originally proposed as 5-NUX (root/trunk/branch/leaf/fruit) following standard tree biology. Stress-tested against the full Shipping Suite and found one consistent miss: **infrastructure / runtime environment** had no home. Added `soilnux` as the 6th node — soil feeds roots, the metaphor still holds, and ~30% of backlog items now have a clean home that didn't before.

The `NuX` suffix denotes "node in the taxonomy" (root-NuX, trunk-NuX, etc.). BranchNuX-the-OSS-tool happens to be the active-verification node in the framework, which is why the metaphor sharpened during the brand rename from TrunkNuX → BranchNuX.

---

## The 6 nodes

### 1. rootnux — the Intent Layer

**Definition:** Why the product is what it is. Specs, decisions, governance, declined-by-design rationales.

**What lives here:**
- `requirements/REQUIREMENTS.md` — R-XX product specs (scaffolded by `rootnux init`)
- `requirements/MASTER_BACKLOG.md` — what remains
- `docs/adr/` — Architecture Decision Records (scaffolded by `rootnux adr-new`)
- `requirements/risks/` — risk register (scaffolded by `rootnux risk-add`)
- `docs/KNOWLEDGE_BASE.md` — KB scaffold (scaffolded by `rootnux kb-init`)
- `docs/governance/` *(scaffold in design)* — vendor list, data classification, threat model specs
- DECLINED + DEFERRED items with rationale

**Role:** The foundation. Anchors everything. A trunk node without a root is orphan code; a fruit without a root is unprovenanced evidence.

**Test:** Does it explain *why* something exists, *should* exist, or *won't* exist? If yes, root.

**Not here:**
- The implementation of a spec → trunknux
- The verification that a spec was met → branchnux
- An external attestation that the spec was correctly built → fruitnux

### 2. trunknux — the Build Layer

**Definition:** What was actually grown. The substance of the product.

**What lives here:**
- `<your-app>/src/` — production code
- `sprint-log/<date>_<title>/` — sprint summaries, commit narratives
- Design system applied (Apex / Apple-Apex ports in code)
- Schemas, migrations, generated types
- Build artifacts (compiled output, package.json, lockfiles)
- Refactor / tech-debt items (Supabase type generation, design token migration)

**Role:** The product itself. Without trunk, there's nothing to verify, nothing to ship.

**Test:** Does it directly produce running code or commit-tracked artifacts in `src/`? If yes, trunk.

**Not here:**
- Specs the code implements → rootnux
- Tests verifying the code → branchnux
- The hosting platform → soilnux

### 3. branchnux — the Verification Layer

**Definition:** Active verification that the trunk is healthy. Active production of evidence.

**What lives here:**
- `testing-log/<date>_<surface>/` — per-page test docs
- `<your-app>/e2e/` — Playwright suites
- `<your-app>/src/**/*.test.ts` — Vitest unit tests
- `requirements/TRACEABILITY.md` — RTM (also connective tissue)
- `/qa`, `/qa-only`, `/review`, `/codex` — verification workflows
- The **BranchNuX OSS tool** itself — runs on a git branch, verifies its claims, produces evidence
- Visual regression, accessibility scans, contract tests

**Role:** The only ACTIVE node. Branches read from trunk + root, transform that into leaves (continuous health) and fruits (audit deliverables).

**Test:** Does it consume trunk + root and produce verification output? If yes, branch.

**Not here:**
- The continuous CI gate firing — that's the leaf (the ongoing signal)
- The signed sign-off packet — that's the fruit (the deliverable)
- The runtime that runs the tests (GitHub Actions = soil)

### 4. leafnux — the Internal Health Layer

**Definition:** Continuous internal vitality. Photosynthesis. The signals that keep the system alive day-to-day.

**What lives here:**
- Sentry error monitoring (the signal stream)
- `/api/health` endpoint
- Structured JSON logging
- CI gates (lint, type-check, test runs on every push)
- Dependabot alerts, secrets-scan workflow
- `/cso` daily run + dashboards
- `/health` composite-score trend, `/benchmark` Core Web Vitals trend
- Audit-log integrity (continuous)
- Performance regression alerts

**Role:** Keeps the tree alive. Without leaves, the tree starves; without continuous health signals, regressions live in production undetected.

**Test:** Does it produce ongoing signal for the team's own consumption? If yes, leaf.

**Not here:**
- The Sentry SDK call sites in code → trunknux
- The Sentry account / DSN config / vendor relationship → soilnux
- A formal SLA report to a regulator → fruitnux

### 5. fruitnux — the External Deliverable Layer

**Definition:** What outsiders consume. The harvest the tree exists to produce.

**Status: Active OSS — promoted in v0.6 (AP-F7).** `sca`, `sca oscal`, `sign`, `sign pdf`, `sign stale-check`, `br init`, `br link`, `br rtm`, `rtm` (11 verbs transferred from branchnux).

**What lives here:**
- `requirements/validations/<surface>/` — Security Control Assessments (SCAs)
- `requirements/validations/<surface>/v*.oscal.json` — NIST OSCAL 1.1.2 evidence
- `<surface>/uat-log.jsonl` — HMAC-chained tamper-evident attestation ledger
- `requirements/TRACEABILITY.md` — Requirements Traceability Matrix
- `requirements/BUSINESS_REQUIREMENTS.md` + `UAT_TRACEABILITY.md` — BR-XX cross-reference
- Pen test reports
- SOC 2 Type II attestation (when shipped)
- KPI dashboard exports for investors
- Regulator-facing PDFs (NYDFS, GDPR, OWASP citations)
- DR plan documents, on-call playbooks, runbooks (the docs)

**Role:** Why the tree exists. Roots, trunk, branches, leaves all serve to grow audit-ready harvest.

**Test:** Does an external party (auditor, regulator, customer, investor) consume this *as-is*, without engineering context? If yes, fruit.

**Not here:**
- The internal commits that produced the SCA → trunknux
- The continuous audit-log integrity that the SCA cites → leafnux
- The DR runtime capability (the running replicated backups) → soilnux. The DR PLAN doc is fruit; the DR system itself is soil.

### 6. soilnux — the Environment Layer

**Definition:** What the tree grows in. The hosting, vendors, infrastructure, runtime operations.

**What lives here:**
- Vercel hosting + env vars
- Supabase (Auth, Postgres, Storage)
- Upstash Redis (rate-limit + future queue)
- AWS (KMS, S3, SES, CloudFront)
- Sentry account, KYC-vendor relationship, auditor operational links
- IaC (Terraform, when added)
- Migration discipline (versioned, reversible, staging-tested)
- Feature flags (the system, not individual flag decisions)
- On-call rotation (PagerDuty)
- DR / backup runtime (the running system)
- DDoS protection (Cloudflare WAF)
- DPAs, sub-processor agreements (the legal infra of vendor relationships)
- Staging environment

**Role:** Without soil, the tree dies. The most fertile soil grows the strongest tree. Most regulated-platform maturity work lives here.

**Test:** Is this a runtime, vendor, environment, or operational state — not code, not a doc? If yes, soil.

**Not here:**
- The decision to use Vercel-not-AWS → rootnux (ADR)
- The vercel.json config code → trunknux
- The DR plan document → fruitnux (the doc itself, even though DR runtime = soil)

---

## How items move through the tree

Most product work flows through 5 of 6 nodes:

```
rootnux  (R-XX written, ADR signed)
   ↓ (intent → implementation)
trunknux (code in src/, sprint-log entry)
   ↓ (artifact → verification)
branchnux (test plan + e2e + RTM mapping)
   ↓ (verification → signals)
leafnux  (continuous CI gate + observability)
   ↓ (signals → deliverable)
fruitnux (SCA + sign-off packet)
```

Soilnux runs in parallel — every node depends on it but doesn't *flow through* it. Soil feeds roots; soil hosts the runtime that emits leaf signals; soil is what the auditor's pen-test attacks.

---

## Cross-cutting pattern: Sentry-style items

~30% of items legitimately span 2-3 nodes. Apply this pattern:

| What | Lives in |
|---|---|
| The code that calls a service | trunknux |
| The service itself + config + env vars | soilnux |
| The signal/data the service produces | leafnux |
| The formal report you hand to auditors | fruitnux |

**Worked example: Sentry**
- Code that imports `@sentry/nextjs` and calls `captureException` → **trunknux**
- The Sentry account, DSN, project config, beforeSend PII scrubbing → **soilnux**
- The error stream, alert routing, dashboards → **leafnux**
- An SLA-compliance report extracted quarterly for SOC 2 evidence → **fruitnux**

This is not a flaw — it's the correct shape of a regulated platform's controls. Don't force-fit into one node.

**Other common cross-cutting items:**

| Item type | Spans | Why |
|---|---|---|
| Security controls (R-41..R-50) | trunk + leaf + fruit | Build → run continuously → produce SCA evidence |
| Audit-log items (R-57, R-84, #34) | trunk + leaf + fruit | Code emits → integrity is continuous → log is regulator deliverable |
| Vendor items (Sumsub, AWS, Sentry) | root + soil | Decision (root) + actual vendor running (soil) |
| DR / on-call playbooks | soil + fruit | Runtime capability lives in soil, the document is fruit |
| Sign-offs (UAT, legal review) | root + fruit | Governance decision + signed packet |
| CI/CD gates (CodeQL, secrets-scan, dependabot) | leaf + soil | Continuous health signal, but runtime is GH Actions infra |

---

## Connective tissue: the RTM

`requirements/TRACEABILITY.md` (the Requirements Traceability Matrix) is the connective tissue that wires rootnux ↔ trunknux ↔ branchnux. It's the **cambium** of the tree — not a 7th node.

Each row in the RTM is a vector:

```
R-XX (root)  →  sprint folder + code file (trunk)  →  test file (branch)  →  open backlog gap
```

When status changes in REQUIREMENTS.md, the matching RTM row updates in the same commit (per `feedback_backlog_verification` memory). Without the RTM, the nodes are isolated; with it, every artifact knows where it came from and where it goes.

The RTM is also itself a fruitnux artifact at version-bump time (auditors love RTMs) — but it lives most of its life as connective tissue.

---

## Out of scope: the meta layer

These are NOT in 6-NUX:

- Project memory (`MEMORY.md`, `feedback_*.md`, `project_*.md`) — accumulated lessons, the gardener's notebook
- CLAUDE.md instruction files — meta-instructions to AI, the gardener's manual
- Toolchain (gstack skills, gbrain, /graphify, multi-agent dispatch) — the gardener's tools
- OSS-tool branding (BranchNuX brand identity, README copy)

These exist *around* the tree. They make tending it possible. They are not parts of it.

If a future session asks "where does CLAUDE.md live in 6-NUX?" — the correct answer is "outside it. CLAUDE.md is the gardener's manual, not part of the tree."

---

## Self-test: classify these

If you can put each in the right node without ambiguity, you understand 6-NUX.

1. `<your-app>/src/lib/rates/engine.ts`
2. `requirements/REQUIREMENTS.md` row R-12
3. `testing-log/2026-04-25_login-23-tc/test-plan.md`
4. The Sentry account at `your-org.sentry.io`
5. `<your-app>/src/lib/rate-limit.ts` (the source file)
6. The Upstash Redis instance + token
7. `requirements/validations/login/v1.0_2026-04-26.md`
8. The `.github/workflows/secrets-scan.yml` running per-push
9. ADR-0007 ("Why Vercel, not AWS")
10. `docs/governance/dr-plan.md` (the document)
11. The actual replicated database backup running in production
12. `requirements/TRACEABILITY.md`

**Answers:**

1. trunknux — source code
2. rootnux — spec
3. branchnux — verification artifact
4. soilnux — vendor/runtime
5. trunknux — source code
6. soilnux — vendor/runtime
7. fruitnux — audit deliverable
8. leafnux — continuous health gate (workflow runtime is soil; the *signal* is leaf)
9. rootnux — decision/governance
10. fruitnux — the document
11. soilnux — runtime capability
12. branchnux — verification artifact + connective tissue

If you got 10+ on first try, the model holds. If you got <8, the most common confusions are: trunk vs soil for vendor-touching code, branch vs leaf for tests vs CI signals, and fruit vs soil for the DR plan (doc vs runtime).

---

## Mapping to a typical project layout

| File / folder | Node | OSS / Premium |
|---|---|---|
| `requirements/REQUIREMENTS.md` | rootnux | OSS |
| `requirements/TRACEABILITY.md` | branchnux + connective tissue | OSS |
| `requirements/validations/<surface>/` | fruitnux | OSS |
| `requirements/risks/` | rootnux | OSS |
| `docs/adr/` | rootnux | OSS |
| `docs/governance/{vendors,data-classification,threat-model}.md` | rootnux | OSS |
| `docs/6-NUX.md` (this file) | meta (the schema) | — |
| `sprint-log/<date>_<title>/` | trunknux | OSS |
| `testing-log/<date>_<surface>/` | branchnux | OSS |
| `<your-app>/src/` | trunknux | OSS |
| `<your-app>/e2e/`, `*.test.ts` | branchnux | OSS |
| Local health checks, CI gate output, file-native perf trends | leafnux | OSS |
| Bundled audit handoff packages, regulator-ready PDFs | fruitnux | OSS |
| Hosting + DBs + queues + observability vendors | soilnux | **Premium** |
| Multi-user backends, account management, hosted dashboards | soilnux | **Premium** |
| Pen test, SOC 2, SCA PDFs | fruitnux | OSS |
| Project memory / AI assistant guides | meta (out of scope) | — |

---

## Why this taxonomy matters operationally

1. **Backlog routing** — every gap in MASTER_BACKLOG has a clear owner-node. "Is this a trunk fix or a soil fix" stops being a debate.
2. **Investor packets** — fruitnux is the section you send. Everything else is "how we got here."
3. **Auditor onboarding** — when your auditors arrive, hand them a fruitnux folder + an RTM and they self-serve for ~80% of their first-day questions.
4. **Status hygiene** — a requirement marked DONE in rootnux must have evidence in trunk + branch + (optionally) fruit. The RTM enforces it.
5. **Maturity gaps** — SHIPPING_SUITE.md §8's four maturity categories map cleanly: Governance = rootnux, Security = leafnux+fruitnux, Infra = soilnux, Operations = soilnux+fruitnux. Easier to track which node is under-invested.

---

## Decision history

- **2026-04-27 (early)** — 5-NUX (root/trunk/branch/leaf/fruit) proposed during a brand-naming discussion for the OSS testing tool. Tested against verb mapping for the tool's CLI surface; held.
- **2026-04-27 (mid)** — Stress-tested against the full Shipping Suite (102 R-XX + 74 backlog items). Identified one consistent gap: infrastructure/runtime had no home. Added `soilnux` as the 6th node.
- **2026-04-27 (late)** — OSS testing tool renamed `TrunkNuX` → `BranchNuX` to align with the taxonomy (a testing tool is conventionally a branch, not a trunk). v0.2.2 → v0.3.0-alpha.1.

---

*Last updated: 2026-04-27. Living document — update when the taxonomy evolves.*
