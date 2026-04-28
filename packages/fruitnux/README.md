# @leapnux/fruitnux

External-deliverables layer of the 6-NUX taxonomy.

**Status:** v0.4.2-alpha.1 — package skeleton. **DEFERRED** to a future sprint with no committed timeline.

## Why deferred

`@leapnux/branchnux` already covers the OSS-CLI portion of audit-evidence generation: `sca`, `sca-oscal`, `rtm`, `sign`, `sign-pdf`. fruitnux's separate scope is intentionally undecided pending:

1. Cross-check against prior PM-platform features (what worked, what bloated)
2. Clarity on which deliverable workflows fit OSS-CLI vs 6-NUX premium:
   - **Likely OSS** — file-native exports, format conversions, local PDF generation
   - **Likely premium** — multi-party sign-off workflows, immutable evidence stores, regulator-facing portals, account-bound access control
3. Pull from at least one production adopter who'd actually use it

A second OSS package may not be needed at all if branchnux's existing verbs cover the file-native deliverable surface.

## Where this fits in 6-NUX

```
root → trunk → branch → leaf → FRUIT (fruitnux) → soil
```

fruitnux is the **external deliverables** layer — SCAs, pen-test reports, SOC 2 packets, regulator-facing PDFs, sign-off packages. The harvest the tree exists to produce.

See [docs/6-NUX.md](https://github.com/StillNotBald/branchnux/blob/main/docs/6-NUX.md) for the artifact taxonomy and [docs/MOTTO.md](https://github.com/StillNotBald/branchnux/blob/main/docs/MOTTO.md) for the OSS/Premium product split.

## License

Apache-2.0 (c) 2026 Chu Ling
