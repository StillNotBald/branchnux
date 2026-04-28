---
adr: 0007
title: "Motto — OSS = entire PM tool chain in CLI; Premium = onboarding, training, hosting, backend, account management"
status: accepted
date: 2026-04-28
---

# ADR-0007: Motto — OSS = entire PM tool chain in CLI; Premium = onboarding, training, hosting, backend, account management

## Status

accepted

## Context

The brand structure (ADR-0001) and license (ADR-0002) establish the "anchor
not revenue" posture. But they do not answer the operational question that
comes up on every roadmap decision: **is this feature OSS or Premium?**

Without an explicit, durable boundary, the line drifts. Common patterns that
destroy community trust:

- **Gradual feature shifting:** ship a feature in OSS, observe uptake, move it
  behind a paywall on the next minor version ("we're just changing the
  distribution model").
- **Capability laundering:** the OSS version technically "supports" a workflow
  but it requires a Premium account to get any value from it.
- **Opacity:** no public statement of where the line is, so adopters never know
  if the workflow they're building on will stay free.

We needed one sentence that any contributor or adopter can apply to any feature
proposal to get a deterministic answer. That sentence is the Motto.

The Motto must be:

1. Testable without asking the maintainer ("does this work offline as a CLI?")
2. Durable (holds at v1.0, v2.0, not just during the alpha)
3. Commercially honest (Premium must reflect genuinely different capabilities,
   not OSS capabilities behind a paywall)

## Decision

The Motto is documented in `docs/MOTTO.md` and governs all product decisions:

> **OSS (5-NUX):** the entire PM tool chain — requirement tracking, sprint
> scaffolding, test planning, RTM, SCA, validation — running fully locally as
> a CLI with no backend, no account, no network required.
>
> **Premium (6-NUX):** everything that is inherently hosted, multi-user, or
> account-bound: onboarding flows, training content, hosted storage, backend
> services, multi-user state, account management, audit-signed evidence chains.

The test for any feature: **"Does this work fully offline as a CLI?"**

- Yes → it belongs in OSS (5-NUX). It must ship in OSS.
- No → it may belong in Premium (6-NUX). It must NOT be added to OSS as a
  degraded / gated experience.

`docs/MOTTO.md` is the canonical reference. This ADR records the decision;
MOTTO.md carries the operational text.

## Consequences

**Better:**

- Every roadmap decision has a clear, automated test. No debate needed.
- Adopters can read MOTTO.md and trust that any workflow they build on 5-NUX
  will remain in 5-NUX. The boundary is public and stable.
- The Motto forces Premium to earn its revenue through genuinely different
  capabilities (hosted infra, multi-user workflows, account management) rather
  than lazy monetization of existing OSS features.
- Contributors know when a PR is in scope and when it is out of scope.

**Worse / trade-offs:**

- Some features that could generate revenue in a hybrid model are off-limits
  for 5-NUX. For example, a "share this sprint summary via a hosted URL"
  feature is Premium by definition (it requires hosting). The OSS version
  generates the file locally; adopters host it themselves.
- "Fully offline as a CLI" means 5-NUX cannot add optional cloud telemetry,
  update checks that phone home, or any network call without it being
  explicitly opt-in and clearly labelled. Higher engineering discipline
  required.

**Risks:**

- If the Motto is not enforced consistently, it becomes decoration — worse than
  having no Motto because it makes explicit promises that are then broken.
  Enforcement mechanism: every PR that adds a network call, account check, or
  hosted dependency must cite this ADR and justify the exception (or move the
  feature to 6-NUX).
- The Motto may constrain a future feature that would genuinely serve OSS
  adopters but requires minimal hosting (e.g. a public ADR badge service). If
  such a case arises, the Motto should be updated via a new ADR — not quietly
  ignored.
