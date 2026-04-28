---
adr: 0002
title: "License — Apache 2.0 single-license for 5-NUX"
status: accepted
date: 2026-04-28
---

# ADR-0002: License — Apache 2.0 single-license for 5-NUX

## Status

accepted

## Context

5-NUX is an anchor product: adoption over revenue. The license choice has
asymmetric consequences. Get it wrong early and you lose the community before
you earn it; change it later (even with good intentions) and you confirm every
adopter's fear.

Options evaluated:

| Option | Notes |
|---|---|
| MIT | Permissive, no patent grant. Simpler. |
| Apache 2.0 | Permissive + explicit patent grant. Industry standard for CLIs and infra tools. |
| GPL v3 | Copyleft — requires derivatives to be GPL. Strong community signal but limits enterprise adoption. |
| AGPL v3 | Network-copyleft. Used as SaaS moat (MongoDB, Grafana). Signals monetization intent. |
| BSL / SSPL | "Source available" with time-delay open. HashiCorp, Elastic, MongoDB used then abandoned by communities. |
| Dual license | Apache + commercial option. Preserves monetization path on the same codebase. |

Key constraint from ADR-0001: premium revenue comes from 6-NUX (separate
product, separate repo) not from relicensing 5-NUX. Dual licensing is therefore
not needed — it solves a problem we've explicitly rejected.

The BSL/SSPL pattern is excluded by principle: it is the primary mechanism of
the bait-and-switch pattern that destroys community trust. We want no such path
to exist, even accidentally.

## Decision

Apache 2.0, single license, no dual licensing, no "may relicense" clause.

- `LICENSE` at repo root contains the full Apache 2.0 text.
- `NOTICE` at repo root is the canonical attribution file.
- Every `.mjs` source file carries a two-line SPDX header:
  `// Copyright (c) 2026 Chu Ling`
  `// SPDX-License-Identifier: Apache-2.0`
- No contributor license agreement (CLA) that could enable future relicensing.
  Contributions are accepted under the project license (Apache 2.0) via
  standard inbound=outbound terms documented in CONTRIBUTING.md.

## Consequences

**Better:**

- Apache 2.0's explicit patent grant protects adopters and contributors from
  patent claims by contributors — MIT does not provide this.
- Industry-standard for CLI tooling and developer infrastructure. No friction
  for enterprise legal teams to approve use.
- No CLA means lower contribution barrier. No future mechanism to relicense
  without re-consent of all contributors.
- "Will this ever be relicensed?" has a clean answer: no mechanism exists to
  do so without re-consent from every contributor.

**Worse / trade-offs:**

- No dual-license monetization path on the OSS codebase. Any contributor who
  wanted to build a SaaS wrapper would be free to do so under Apache 2.0.
  That's the point — but it removes a revenue lever.
- Apache 2.0 is slightly more verbose to include in NOTICE files than MIT.
  Trivial operational cost.

**Risks:**

- Someone builds a competing hosted product on top of 5-NUX. Apache 2.0
  explicitly allows this. Our competitive moat must be product quality,
  community, and the premium 6-NUX capabilities — not license lock-in.
  Accepted.
