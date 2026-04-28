# @leapnux/leafnux

Continuous-internal-health layer of the 6-NUX taxonomy.

**Status: v0.5.0-alpha.1 — `health` verb shipping.**

leafnux is an active OSS package. The `health` verb is the first CLI surface for the
continuous-health node of the tree: it reads your project's known artifacts and status
files, evaluates health signals locally, and reports a composite score with per-check
detail — all file-native, no account required.

## Install

```sh
npm install -g @leapnux/leafnux
```

Or install the full 5-NUX family:

```sh
npm install -g @leapnux/5nux
```

## Usage — `health`

Run a health check on your project:

```sh
leafnux health
```

Sample output:

```
your-project health — 2026-04-27

  requirements   OK   102 R-XX found, 0 missing status
  sprint-log     OK   4 sprint folders, latest 2026-04-26
  testing-log    WARN 3 surfaces lack a test-plan.md
  traceability   OK   RTM present, 102 rows
  risks          OK   risks.md present
  adrs           INFO 0 ADRs (run rootnux adr-new to add one)

Score: 5/6 checks OK  (1 warning)
```

### `--json`

Machine-readable output for CI pipelines:

```sh
leafnux health --json
```

Returns a JSON object with `score`, `checks[]`, and `timestamp`.

### `--quiet`

Exit-code-only mode. Exit 0 = all checks OK; exit 1 = one or more warnings or failures.
Suitable for a CI gate step:

```sh
leafnux health --quiet || echo "health gate failed"
```

### `--check <name>`

Run a single named check:

```sh
leafnux health --check requirements
leafnux health --check sprint-log
leafnux health --check testing-log
leafnux health --check traceability
```

## OSS / Premium boundary

`leafnux health` is fully local and file-native — it reads only files in your working
directory. No network call, no account, no usage cap.

The following are **not** part of leafnux and belong in the premium 6-NUX tier:
- Hosted dashboards aggregating health scores across multiple projects
- Account-bound alerting and trend history
- Multi-project rollups with access control

## Where this fits in 6-NUX

```
root → trunk → branch → LEAF (leafnux) → fruit → soil
```

leafnux is the **continuous health** layer — observability signals, CI/CD gates,
dependabot, secrets-scan, performance trends, audit-log integrity. The day-to-day
vital signs that keep the tree alive.

See [docs/6-NUX.md](https://github.com/StillNotBald/branchnux/blob/main/docs/6-NUX.md)
for the artifact taxonomy and
[docs/MOTTO.md](https://github.com/StillNotBald/branchnux/blob/main/docs/MOTTO.md)
for the OSS/Premium product split.

## License

Apache-2.0 (c) 2026 Chu Ling

## Part of the 5-NUX family

Sibling packages: [rootnux](../rootnux), [trunknux](../trunknux), [branchnux](../branchnux), [leafnux](../leafnux), [fruitnux](../fruitnux), [6nux-core](../6nux-core), [5nux meta](../5nux). See the [root README](../../README.md) for the full taxonomy and install instructions.
