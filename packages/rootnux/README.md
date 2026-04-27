# @leapnux/rootnux

Intent-layer CLI for the 6-NUX taxonomy. Manages requirements (R-XX), ADRs, decisions, risks.

**Status:** v0.4.1 — all 5 verbs implemented.

## Verbs

```
rootnux init                    # scaffold requirements/REQUIREMENTS.md + TRACEABILITY.md + risks/ + docs/adr/
rootnux lint                    # validate R-XX schema, cross-links, status values (exit 0 / 1 / 2)
rootnux adr-new <title>         # scaffold a new ADR with sequential NNNN numbering in docs/adr/
rootnux risk-add                # append a templated row to requirements/risks/risks.md
rootnux status [--json]         # show DONE/BLOCKED/PARTIAL/NOT STARTED/... counts + percentages
```

## Quick start

```sh
cd my-project
rootnux init                    # scaffold artifacts
rootnux adr-new "Use PostgreSQL"
rootnux risk-add
rootnux lint                    # validate everything
rootnux status                  # see completion %
```

## Verb reference

### `rootnux init`

Idempotent scaffolding. Creates if absent, skips if present. Never overwrites.

Creates:
- `requirements/REQUIREMENTS.md` — R-XX table with `schema: rxx-v1` frontmatter
- `requirements/TRACEABILITY.md` — RTM table with `schema: rtm-v1` frontmatter
- `requirements/risks/risks.md` — risk register table
- `docs/adr/` — directory for ADR files

### `rootnux lint`

Validates requirements artifacts in cwd:
- Extracts all `R-XX` IDs from REQUIREMENTS.md
- Cross-links to TRACEABILITY.md — orphan R-XX reported as errors
- Validates status values: `DONE | BLOCKED | PARTIAL | NOT STARTED | DECLINED | DEFERRED | FAKE`
- Checks for duplicate R-XX IDs
- Warns if `schema: rxx-v1` frontmatter is missing (warning, not error)

Exit codes: `0` clean, `1` errors found, `2` rootnux init not run.

### `rootnux adr-new <title>`

Scaffolds `docs/adr/NNNN-<slug>.md`. Finds highest existing number, increments by 1.

Generates kebab-case slug from title. Includes YAML frontmatter (`adr`, `title`, `status: proposed`, `date`) and sections: Status, Context, Decision, Consequences.

### `rootnux risk-add`

Appends a templated row to `requirements/risks/risks.md`. Auto-increments Risk ID. Default: `R-NN | <DOMAIN> | <RISK DESCRIPTION> | MED | OPEN`.

Requires `rootnux init` first (exit 2 if file missing).

### `rootnux status [--json]`

Reads `requirements/REQUIREMENTS.md`, counts R-XX by status, prints a table:

```
Status        Count    %
------------  -------  ------
DONE               82     79%
BLOCKED            11     11%
NOT STARTED         9     10%
------------  -------  ------
Total             102    100%
```

`--json` emits machine-readable JSON: `{ "DONE": { "count": 82, "pct": 79 }, ... "total": 102 }`.

## Where this fits

rootnux is the **intent layer** of the 6-NUX taxonomy:

```
ROOT (rootnux)  → trunk → branch → leaf → fruit → soil
```

It captures *why* the product is what it is — specs, decisions, declined-by-design rationales, risk register, governance docs.

See the [6-NUX taxonomy doc](https://github.com/StillNotBald/branchnux) for the full picture.

## Install

```sh
npm install -g @leapnux/rootnux       # just rootnux
npm install -g @leapnux/5nux           # full 5-NUX OSS stack
```

## License

Apache-2.0 (c) 2026 Chu Ling
