# @leapnux/trunknux

Build-layer CLI for the 6-NUX taxonomy. Manages sprint scaffolding, build narratives, and summaries.

**Status:** v0.4.1-alpha.1 — three verbs shipped: `new-sprint`, `summarize`, `lint`.

## Verbs

```
trunknux new-sprint <slug>      # create date-prefixed sprint-log/<date>_<slug>/ folder
trunknux summarize              # generate SPRINT_SUMMARY.md from git log
trunknux lint                   # verify sprint folder structure conventions
```

### `trunknux new-sprint <slug>`

Creates `sprint-log/<YYYY-MM-DD>_<slug>/` with a scaffolded `README.md`.

- Slug must be kebab-case (lowercase letters, digits, hyphens).
- Idempotent: prints "Sprint folder already exists" and exits 0 if folder is present.
- `--no-readme` — skip README scaffolding (create folder only).

### `trunknux summarize`

Generates `SPRINT_SUMMARY.md` in the most-recent (or named) sprint folder by grouping `git log` output into conventional-commit sections.

- `--sprint <name>` — target a specific sprint slug.
- `--since <YYYY-MM-DD>` — git log start date (default: sprint folder date).
- `--until <YYYY-MM-DD>` — git log end date (default: today).
- `--force` — overwrite an existing `SPRINT_SUMMARY.md`.

### `trunknux lint`

Validates every folder in `sprint-log/` against naming conventions and README structure.

- Checks `<YYYY-MM-DD>_<kebab-slug>` folder name format with valid dates.
- Checks that `README.md` exists and contains YAML frontmatter with `sprint:` and `date:` keys.
- `--json` — machine-readable JSON output.
- Exits 0 (clean), 1 (errors), or 2 (no sprint-log found).

## Where this fits

trunknux is the **build layer** of the 6-NUX taxonomy:

```
root → TRUNK (trunknux)  → branch → leaf → fruit → soil
```

It captures *what was actually grown* — sprint summaries, commit narratives, build artifacts.

## Install

```sh
npm install -g @leapnux/trunknux       # just trunknux
npm install -g @leapnux/5nux           # full 5-NUX OSS stack
```

## License

Apache-2.0 (c) 2026 Chu Ling

## Part of the 5-NUX family

Sibling packages: [rootnux](../rootnux), [trunknux](../trunknux), [branchnux](../branchnux), [leafnux](../leafnux), [fruitnux](../fruitnux), [6nux-core](../6nux-core), [5nux meta](../5nux). See the [root README](../../README.md) for the full taxonomy and install instructions.
