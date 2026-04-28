---
adr: 0003
title: "Monorepo + npm workspaces"
status: accepted
date: 2026-04-28
---

# ADR-0003: Monorepo + npm workspaces

## Status

accepted

## Context

5-NUX is a family of 7 related packages that share internals via
`@leapnux/6nux-core`. The repo structure choice affects contributor experience,
release mechanics, cross-package refactoring cost, and CI complexity.

Packages at decision time:
`@leapnux/6nux-core`, `@leapnux/rootnux`, `@leapnux/trunknux`,
`@leapnux/branchnux`, `@leapnux/leafnux`, `@leapnux/fruitnux`, `@leapnux/5nux`

Options evaluated:

| Option | Pros | Cons |
|---|---|---|
| 7 separate repos | Maximum isolation, independent CI | Cross-package refactors span PRs; contributor must clone 7 repos; 6nux-core changes require 6 downstream PRs |
| Monorepo + npm workspaces | Single clone, single install, cross-package PRs | Slightly more root config to maintain |
| Monorepo + Turborepo | Adds remote caching, task graph | Adds Turborepo dependency + config complexity; overkill for 7 packages with simple build (ESM, no build step) |
| Monorepo + Nx | Powerful but heavy | Config overhead, code generation patterns, steep onramp. Overkill. |
| Monorepo + Lerna | Historical standard | Largely superseded by npm workspaces for publishing; extra dependency |

Key constraint: ESM-only, no build step (see ADR-0005). Turborepo and Nx shine
when there is a build graph to parallelise. Without `dist/` compilation, their
main value-add evaporates.

## Decision

Monorepo at `github.com/leapnux/5nux` (currently `StillNotBald/branchnux`,
transferring when the org is created). npm workspaces only. No Turborepo, no
Nx, no Lerna.

Structure:

```
package.json (root, private: true, workspaces: ["packages/*"])
packages/
  6nux-core/    → @leapnux/6nux-core
  rootnux/      → @leapnux/rootnux
  trunknux/     → @leapnux/trunknux
  branchnux/    → @leapnux/branchnux
  leafnux/      → @leapnux/leafnux   (skeleton)
  fruitnux/     → @leapnux/fruitnux  (skeleton)
  5nux/         → @leapnux/5nux      (meta)
```

Shared configs at root: `.eslintrc`, `tsconfig.base.json` (if added),
`vitest.workspace.mjs`. Single `package-lock.json`.

## Consequences

**Better:**

- Single `git clone` + single `npm install` for contributors. Zero setup
  friction to run any package's tests.
- Cross-package refactors (e.g. renaming a constant in `6nux-core`) land as a
  single PR with a single diff. Reviewers see the full blast radius.
- Shared eslint / vitest configs at root prevent config drift between packages.
- Atomic releases: one tag, one lockfile, one CI run covers all packages.

**Worse / trade-offs:**

- Root-level `node_modules` grows with all packages' combined deps. At 7
  packages this is trivial.
- A misbehaved contributor script at root has theoretical access to all
  packages' source. Mitigated by code review.
- If a single package ever needs to spin out to its own repo (e.g. 6nux-core
  going to a separate GitHub org for 6-NUX), it requires a migration. Accepted
  trade-off; we are nowhere near that scale.

**Risks:**

- npm workspaces hoisting can cause subtle resolution differences from what
  a standalone consumer would see. Mitigated by the ESM import path discipline
  in ADR-0005 and by CI running `npm pack` smoke tests before publish.
