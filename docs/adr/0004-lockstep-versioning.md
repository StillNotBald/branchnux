---
adr: 0004
title: "Lockstep versioning"
status: accepted
date: 2026-04-28
---

# ADR-0004: Lockstep versioning

## Status

accepted

## Context

With 7 packages in the monorepo, version coordination has two shapes:

**Independent versioning:** each package increments its own version only when
it changes. A patch to `rootnux` does not force `branchnux` to bump.

**Lockstep versioning:** all packages share one version, bumped together on
every release. React, Vue, Vite, and the Angular family use this approach.
Babel chose independent; the Angular team famously switched from independent to
lockstep after compatibility-matrix support became untenable.

The 5-NUX packages interact via file-system convention (ADR-0006), not via
typed imports. This means a runtime incompatibility between, say,
`rootnux@0.5` writing an ADR schema and `branchnux@0.3` reading it would be
silent — no module resolution error, just corrupted data. The versioning
strategy is therefore also a compatibility-signalling strategy.

Key constraint: at the alpha stage, all 5-NUX packages are evolved by one
person with no downstream consumer stability guarantees. The marginal cost of
bumping 7 packages is zero.

## Decision

Lockstep versioning. Every release tag bumps every published package to the
same version, even if a specific package had no changes in that release.

Version format: `MAJOR.MINOR.PATCH[-PRERELEASE]` (semver).
Current line: `0.4.x-alpha.y` during the alpha period.

The root `package.json` carries the canonical version. The release script
(when automated) syncs all `packages/*/package.json` to match before publish.

## Consequences

**Better:**

- "What version of LeapNuX am I on?" has exactly one answer. Adopters install
  `@leapnux/rootnux@0.5.0` and `@leapnux/branchnux@0.5.0` — the `0.5.0` means
  they were tested together.
- No compatibility matrix support burden. The question "does rootnux@0.5 work
  with branchnux@0.3?" never arises.
- Atomic mental model: a release tag captures the entire taxonomy at a known
  good state.
- Simplifies the CHANGELOG: one log, one version history, one set of release
  notes.

**Worse / trade-offs:**

- A single-package patch ships under a version bump that touches all packages,
  including packages with no changes. Adopters running `npm outdated` will see
  all packages bump even if the change doesn't affect them. Acceptable while
  the taxonomy is small (7 packages).
- If a package is genuinely stable and another is in heavy churn, lockstep
  forces stable packages to emit unnecessary patch versions. Minor cosmetic
  noise.

**Risks:**

- If the taxonomy grows to 30+ packages, the "unnecessary bump" problem becomes
  noisier. Revisit if the package count grows significantly. At current scale
  (7 packages, 1 active contributor), the trade-off is firmly positive.
