# @leapnux/branchnux

Verification layer of the 6-NUX taxonomy. Active testing + validation CLI in the 5-NUX stack — ~14 verbs covering test plan discovery, LLM-assisted planning, report generation, validation, visual regression, and env-diff.

**Status: v0.5.0-alpha.1 — active.** Production-tested against 435+ vitest cases. Every verb has `--json` mode for agent-driven workflows.

**v0.6 note:** Audit-deliverable verbs (`sca`, `sign`, `br`, `rtm`) have moved to `@leapnux/fruitnux` — the external-deliverables node. Branchnux retains deprecation shims through v0.6.x. See [migration](#migration-from-v05) below.

branchnux turns the verification stage of regulated software into a CLI: discover what to test → draft test plans → codify into Playwright spec.ts → run reports → validate hygiene → compare results across environments. Plain Markdown / XLSX / JSON outputs land in your repo.

Audit deliverables (SCA, OSCAL, HMAC sign-off ledgers, RTM, BR-attestations) are now in `@leapnux/fruitnux`.

## Install

```sh
npm install -g @leapnux/branchnux
```

Or install the full 5-NUX family (includes fruitnux):

```sh
npm install -g @leapnux/5nux
```

## Verbs

| Verb | What it does |
|---|---|
| `branchnux init <surface>` | Scaffold `testing-log/<date>_<surface>/` with `test-plan.md`, `evidence/`, and a Playwright spec template. |
| `branchnux discover <url>` | Crawl a URL surface and propose test scenarios (LLM-powered). |
| `branchnux plan <surface>` | Draft `test-plan.md` with `[VERIFY]` markers on every TC (LLM-powered). |
| `branchnux codify <surface>` | Generate Playwright `spec.ts` from `test-plan.md` (LLM-powered). Vanilla output by default — use `--test-conventions <name>` for stack-specific patterns. |
| `branchnux enrich <surface>` | Append-only enrichment passes — security gaps, accessibility, edge cases (LLM-powered). |
| `branchnux batch-plan` | Parallel LLM agents: discover→plan→codify→enrich for multiple pages. |
| `branchnux report <surface>` | Merge `test-plan.md` + execution log → XLSX matrix + standalone HTML execution report. |
| `branchnux validate <surface>` | Lint a testing-log folder against the schema. |
| `branchnux run <slug>` | Env-aware test-pass scaffold + report in one command. |
| `branchnux compare <slug> <env-a> <env-b>` | Diff TC results across two environment passes. |
| `branchnux visual baseline <surface>` | Capture full-page baseline screenshots for all TCs. |
| `branchnux visual compare <surface>` | Pixel-diff current screenshots against baseline. |
| `branchnux doctor` | Diagnose installed dependencies (Node, Playwright, optional peer deps). |
| `branchnux demo` | Open the bundled demo execution report in your browser. |

Run `<verb> --help` for the full flag surface, or see [docs/reference.md](https://github.com/leapnux/5nux/blob/main/docs/reference.md).

## Audit deliverables — use fruitnux

The following verbs are now in `@leapnux/fruitnux`:

| Verb | What it does |
|---|---|
| `fruitnux rtm` | Regenerate `requirements/TRACEABILITY.md` |
| `fruitnux sca init <surface>` | Scaffold 8-section Security Control Assessment |
| `fruitnux sca generate <surface>` | Fill SCA evidence rows from test results |
| `fruitnux sca pdf <surface>` | Render SCA to PDF |
| `fruitnux sca oscal <surface>` | Emit NIST OSCAL 1.1.2 JSON |
| `fruitnux sign <surface>` | HMAC-chained tamper-evident attestation |
| `fruitnux sign pdf <surface>` | Render sign-off ledger to PDF |
| `fruitnux sign stale-check <surface>` | Flag stale attestation entries |
| `fruitnux br init <id>` | Scaffold BR-XX business requirement |
| `fruitnux br link <br-id> <r-ids>` | Add BR-XX → R-ID mapping |
| `fruitnux br rtm` | Render UAT traceability matrix |

## Migration from v0.5

```sh
# Old (v0.5, still works via deprecation shim in v0.6):
branchnux rtm
branchnux sca generate login
branchnux sign login

# New (v0.6+):
fruitnux rtm
fruitnux sca generate login
fruitnux sign login
```

Deprecation shims in branchnux v0.6 print a warning and forward to fruitnux. Shims will be **removed in v0.7.0**.

## Test-conventions profiles

`codify` generates vanilla Playwright TypeScript by default — no helpers specific to any stack. For projects with infrastructure-level test requirements (rate-limit isolation, form hydration quirks, TOTP collision guards), opt in with:

```sh
branchnux codify login --test-conventions nextjs-supabase
```

| Profile | Stack | Patterns injected |
|---|---|---|
| `nextjs-supabase` | Next.js + Supabase + Upstash | `xffForTest()` XFF isolation, `form.requestSubmit()`, `waitForNextTotpWindow()`, `captureEvidence()` |

Author your own profile at `src/config/test-conventions/<name>.json` — see [`docs/reference.md`](https://github.com/leapnux/5nux/blob/main/docs/reference.md#test-conventions-profiles) for the schema.

## Cost-gated LLM verbs

`discover`, `plan`, `codify`, `enrich` call the Anthropic API via `@anthropic-ai/sdk` (an **optional peer dependency** — only installed when you use those verbs). Cost-control flags on every LLM verb:

- `--dry-run` — print planned LLM calls and estimated cost; mandatory first run for any new project.
- `--max-spend <USD>` — abort mid-run if cost exceeds the cap.
- `--json` — structured output for downstream agent processing.

Set `CLAUDE_API_KEY` environment variable to enable. Deterministic-core verbs (`init`, `report`, `validate`, `run`, `compare`, `visual`, `doctor`) make zero network calls and require no API key.

## The `[VERIFY]` marker contract

LLM-drafted cells in `test-plan.md` ship with `[VERIFY]` markers. Removing a marker IS the human attestation — see [`docs/collaboration.md`](https://github.com/leapnux/5nux/blob/main/docs/collaboration.md) for the full AI/human boundary doc. Removing a `[VERIFY]` without reading the underlying content is the one way to make an audit fail.

## Where this fits in 6-NUX

```
root → trunk → BRANCH (branchnux) → leaf → fruit → soil
```

branchnux is the **verification** layer. Upstream: `rootnux` produces R-XX requirements; `trunknux` records what was built. Downstream: `leafnux` watches health; `fruitnux` produces audit-deliverable packages (SCA, OSCAL, sign-offs, RTM).

NUX packages do **not** import each other — they communicate via file-system conventions in `@leapnux/6nux-core`. See [`docs/ARCHITECTURE.md`](https://github.com/leapnux/5nux/blob/main/docs/ARCHITECTURE.md) for the implementation spec.

## Sibling packages

[rootnux](https://www.npmjs.com/package/@leapnux/rootnux), [trunknux](https://www.npmjs.com/package/@leapnux/trunknux), [branchnux](https://www.npmjs.com/package/@leapnux/branchnux), [leafnux](https://www.npmjs.com/package/@leapnux/leafnux), [fruitnux](https://www.npmjs.com/package/@leapnux/fruitnux), [6nux-core](https://www.npmjs.com/package/@leapnux/6nux-core), [5nux meta](https://www.npmjs.com/package/@leapnux/5nux). See the [root README](https://github.com/leapnux/5nux#readme) for the full taxonomy and install instructions.
