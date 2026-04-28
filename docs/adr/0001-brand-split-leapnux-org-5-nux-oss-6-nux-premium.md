---
adr: 0001
title: "Brand split — LeapNuX (org), 5-NUX (OSS), 6-NUX (premium)"
status: accepted
date: 2026-04-28
---

# ADR-0001: Brand split — LeapNuX (org), 5-NUX (OSS), 6-NUX (premium)

## Status

accepted

## Context

We are building an OSS PM tool chain and needed a brand structure from day one.
The core tension: we want the OSS product to be an anchor (maximise adoption,
build community trust, never rug-pull) while preserving room for a premium
commercial offering that does not cannibalise or undermine the OSS.

Without a declared structure, typical failure modes are:

- The OSS repo becomes the demo tier of a SaaS — adopters feel baited.
- The org name and product name blur together, making it hard to explain
  "is the free thing free forever?"
- Future commercial work ships into the OSS repo under a relicense notice
  (the HashiCorp/MongoDB/Elastic pattern), destroying community trust.

We also needed a durable marker for which products belong to the same
conceptual family (the NUX taxonomy) and which are unrelated LeapNuX products.

Constraints:

- Must work for an individual founder before any team exists.
- Must survive the transition to an actual company without renaming the OSS.
- Must telegraph "anchor, not revenue" credibly to a technical audience.

## Decision

Three-layer brand structure:

| Layer | Name | Role |
|---|---|---|
| Organisation / company | **LeapNuX** | The legal and public entity. leapnux.com. |
| OSS product | **5-NUX** | The open-source PM tool chain. This monorepo. Apache 2.0. |
| Premium product | **6-NUX** | Future commercial product. Separate repo, separate license. |

The **NUX suffix** is the family marker. It signals membership in the 6-NUX
taxonomy (rootnux, trunknux, branchnux, leafnux, fruitnux, soilnux). Future
LeapNuX products outside this taxonomy will not carry the NUX suffix.

6-NUX adds the `soilnux` node plus hosted infrastructure, multi-user workflows,
and account management. It is a genuinely different product, not a paywall
layer on top of 5-NUX.

The 5-NUX OSS codebase will never be relicensed. Premium revenue comes
exclusively from capabilities that require a hosted backend — capabilities that
cannot ship as a local CLI tool.

## Consequences

**Better:**

- Clear public-facing story. "5-NUX is free, forever" is a credible statement
  because the brand structure makes the boundary explicit.
- OSS adopters can make an adoption decision without fearing a future bait-and-
  switch. Apache 2.0 is irrevocable.
- The NUX suffix gives a clean way to describe the family in docs and marketing
  without inventing new terminology per product.

**Worse / trade-offs:**

- Slightly more complex to explain ("what is LeapNuX vs 5-NUX?") to non-
  technical audiences. Mitigated by clear landing-page copy.
- The org name (LeapNuX) is tied to the taxonomy. If we ever build a product
  completely outside the PM tool chain, the org name still implies the NUX
  world. Acceptable at current scope.

**Risks:**

- Premium revenue requires building genuinely different capabilities (hosting,
  accounts, multi-user state). We cannot lazy-monetize the OSS. That is
  intentional, but it raises the bar for commercial success.
- If 6-NUX never ships, the brand structure still holds — 5-NUX stands on its
  own as an OSS anchor product.
