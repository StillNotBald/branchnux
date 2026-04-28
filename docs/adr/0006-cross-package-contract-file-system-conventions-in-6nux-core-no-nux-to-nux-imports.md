---
adr: 0006
title: "Cross-package contract — file-system conventions in 6nux-core, no NUX-to-NUX imports"
status: accepted
date: 2026-04-28
---

# ADR-0006: Cross-package contract — file-system conventions in 6nux-core, no NUX-to-NUX imports

## Status

accepted

## Context

NUX packages need to interoperate. The canonical example: `rootnux adr-new`
writes an ADR file; `branchnux rtm` reads ADR files to verify cross-links.
The two packages must agree on where ADRs live and what they look like.

Two architectural shapes for that coordination:

**Import-level (typed contract):**
`rootnux` exports its ADR schema types and path constants; `branchnux` imports
`@leapnux/rootnux` to consume them.

Consequences of import-level: `branchnux` depends on `rootnux`. Users who only
want `branchnux` must install `rootnux`. If `rootnux` introduces a breaking
change, `branchnux` breaks at module resolution time. The dependency graph
becomes a DAG, not a star — harder to reason about as the family grows.
Cyclic dependency risk is real if two packages each need types from the other.

**File-level (convention contract):**
Both packages depend on `@leapnux/6nux-core` which exports the path constants,
slug patterns, and schema definitions. `rootnux` writes to the paths defined in
`6nux-core`; `branchnux` reads from those same paths. Neither imports the other.

The 6-NUX taxonomy has a clear star topology: every NUX package depends on
`6nux-core`; no NUX package depends on another NUX package.

## Decision

File-level convention contract only. No NUX package imports another NUX package.

Dependency rule:

```
       @leapnux/6nux-core
       ↑   ↑   ↑   ↑    ↑
   rootnux trunknux branchnux leafnux fruitnux
```

`@leapnux/6nux-core` is the single allowed shared dependency across the family.
It exposes:

| Module | What it encodes |
|---|---|
| `6nux-core/conventions` | `PATHS` (canonical directory locations), `SCHEMAS`, `STATUSES`, slug regexes |
| `6nux-core/ids` | `slugify()`, `todayISO()`, `isValidSlug()`, `RXX_PATTERN` |
| `6nux-core/utils` | `parseMarkdownFrontmatter()`, `yamlQuote()`, `readFileWithSizeCap()` |
| `6nux-core/schemas` | JSON Schemas for R-XX, ADR, sprint folder, test plan (v0.5+) |
| `6nux-core/validators` | High-level validators built on schemas (v0.5+) |

Schema changes in `6nux-core` are **high-stakes**: a breaking change here
breaks all downstream packages simultaneously. Versioned sub-paths
(`schemas/v1/`, `schemas/v2/`) are the migration path. v1 is never broken
in place.

## Consequences

**Better:**

- Any single NUX package works standalone. `npm i -g @leapnux/rootnux` is
  sufficient for ADR scaffolding even if `branchnux` is not installed.
- No cyclic dependency risk. The dependency graph is a flat star.
- Adding a new NUX package to the family requires only adding a dependency on
  `6nux-core`. It does not require updating every existing package.
- The file-system interface is inspectable and auditable by humans without
  running code ("does `docs/adr/0001-*.md` exist?" requires only `ls`).

**Worse / trade-offs:**

- File-system contracts are slightly less strict than typed imports. A path
  mismatch (e.g. `rootnux` writes to `docs/adr/` but `branchnux` reads from
  `docs/adrs/`) fails silently at runtime rather than at module resolution.
  Mitigated by: `PATHS` constants in `6nux-core` (both packages read the same
  constant) and runtime validators (planned v0.5+).
- Cross-package integration tests must set up real directory structures rather
  than mocking imports. Slightly more test infrastructure.

**Risks:**

- `6nux-core` schema evolution is the single highest-risk change in the
  codebase. A poorly planned schema bump can silently corrupt ADR or RTM
  artifacts that are checked into adopter repos. Versioned namespaces and
  backwards-compatible defaults are mandatory for any schema change.
