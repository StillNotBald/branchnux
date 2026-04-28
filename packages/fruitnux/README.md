# @leapnux/fruitnux

External-deliverables layer of the 6-NUX taxonomy.

**Status: Active scope, verbs in design** — first verb candidate is `fruitnux pack`
(bundle ADRs + risks + RTM + SCAs into a regulator-ready handoff). Targeting v0.5.1+.

## What fruitnux does

fruitnux is the harvest node: it takes artifacts already produced by rootnux (specs,
ADRs, risks), branchnux (RTM, SCAs, signed evidence), and trunknux (sprint summaries)
and assembles them into a single, structured handoff package that an auditor, regulator,
or external reviewer can open without installing any tooling.

`branchnux` already covers the *production* of individual audit artifacts (`sca`,
`sca-oscal`, `sign`, `sign-pdf`, `rtm`). fruitnux's distinct role is **assembly and
packaging** — combining those artifacts into a coherent, versioned deliverable bundle.

## First verb: `fruitnux pack`

`fruitnux pack` is the leading design candidate. It will:

1. Collect ADRs from `docs/adr/`, risks from `requirements/risks/`, RTM from
   `requirements/TRACEABILITY.md`, and SCAs from `requirements/validations/`.
2. Emit a structured output folder (Markdown index + referenced files) ready to zip
   and hand to an auditor or attach to a regulator submission.
3. Stay entirely file-native and local — no account, no upload, no hosted service.

Design is in progress. The verb surface and schema will be published here before
implementation begins.

## Why fruitnux is a separate package from branchnux

branchnux verifies and *produces* evidence artifacts one surface at a time.
fruitnux *assembles* them across surfaces into a deliverable. The concerns are
distinct: branchnux is a verification tool; fruitnux is a packaging and handoff tool.
Keeping them separate preserves the ability to install either standalone.

## OSS / Premium boundary

File-native assembly + local PDF generation = OSS (fruitnux).

The following belong in the premium 6-NUX tier:
- Multi-party sign-off workflows with live state
- Immutable evidence stores hosted off-machine
- Regulator-facing portals with account-bound access control

## Where this fits in 6-NUX

```
root → trunk → branch → leaf → FRUIT (fruitnux) → soil
```

fruitnux is the **external deliverables** layer — SCAs, pen-test reports, SOC 2
packets, regulator-facing PDFs, sign-off packages. The harvest the tree exists to
produce.

See [docs/6-NUX.md](https://github.com/StillNotBald/branchnux/blob/main/docs/6-NUX.md)
for the artifact taxonomy and
[docs/MOTTO.md](https://github.com/StillNotBald/branchnux/blob/main/docs/MOTTO.md)
for the OSS/Premium product split.

## License

Apache-2.0 (c) 2026 Chu Ling

## Part of the 5-NUX family

Sibling packages: [rootnux](../rootnux), [trunknux](../trunknux), [branchnux](../branchnux), [leafnux](../leafnux), [fruitnux](../fruitnux), [6nux-core](../6nux-core), [5nux meta](../5nux). See the [root README](../../README.md) for the full taxonomy and install instructions.
