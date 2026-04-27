# LeapNuX — OSS / Premium Split (locked 2026-04-28)

This is the canonical product split for the LeapNuX ecosystem. All future product
decisions defer to this line.

## OSS — `5-NUX` (free, Apache 2.0)

> **The entire Project Management tool chain in your CLI: requirement → sprint → test → validation → ship.**

Everything a regulated software team needs to author, build, verify, and produce
audit-ready evidence — running locally on the developer's machine, no account,
no hosted backend, no usage cap. Five NUX-suffixed CLIs cover the full lifecycle:

| Stage | Package | Verbs |
|---|---|---|
| **Requirement** | `@leapnux/rootnux` | `init`, `lint`, `adr-new`, `risk-add`, `status` |
| **Sprint** | `@leapnux/trunknux` | `new-sprint`, `summarize`, `lint` |
| **Test** | `@leapnux/branchnux` | `init`, `plan`, `codify`, `report`, `validate`, `enrich`, `discover`, `visual`, ... |
| **Validation** | `@leapnux/branchnux` | `rtm`, `sca`, `sca-oscal`, `sign`, `sign-pdf` |
| **Ship** | (delegated to host CI / `gh` / `npm publish`) | — |

Install everything in one command: `npm install -g @leapnux/5nux`.

## Premium — `6-NUX` and beyond (commercial license, future)

Everything that requires a hosted service, an account, human-in-the-loop work, or
operational responsibility on someone else's infrastructure. Out of scope for the
OSS layer by design — the OSS is anchor-not-revenue, premium is where the
business sustains itself.

| Surface | What it covers |
|---|---|
| **Onboarding** | Guided setup for new orgs, requirement-import migrations, audit-trail bootstrapping |
| **Training** | Workshops, certification, recorded curriculum, audit-prep coaching |
| **Hosting** | Managed `leapnux.com` SaaS — runs the 5-NUX pipeline against your repos with no local install |
| **Backend** | Multi-user state, RBAC, immutable audit log, signed evidence chain hosted off-machine |
| **Account management** | Org tier, seat licensing, support SLAs, dedicated audit liaisons |

The `soilnux` node of 6-NUX (the runtime/infra/vendor layer) is the engineering
home of these capabilities. They share the 6-NUX taxonomy with the OSS but
require a commercial license.

## Why this split

1. **OSS reaches every developer.** A team of 1 with no budget gets the full
   PM tool chain. Adoption builds the LeapNuX brand.
2. **Premium reaches every regulated org.** SOC 2 auditors, NYDFS examiners, and
   internal compliance teams want hosted, signed, multi-user evidence with
   account-bound access — that's a different product, with different operational
   requirements.
3. **No bait-and-switch.** OSS will never be relicensed to BSL/SSPL. Apache 2.0
   stays Apache 2.0. Premium ships as a separate-product-with-commercial-license
   so OSS adopters never lose what they have.

## Decision history

- **2026-04-28** — Locked. CEO + eng review confirmed open-core-with-soil-as-premium
  is the right line; user added that the cleanest split is "OSS = entire PM tools
  in CLI, Premium = hosted/operational layer". This file captures that decision.

---

*See `docs/6-NUX.md` for the underlying artifact taxonomy.*
*See `project_5nux_product_plan` memory for monorepo structure + roadmap.*
