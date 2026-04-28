# @leapnux/leafnux

Continuous-internal-health layer of the 6-NUX taxonomy.

**Status:** v0.4.2-alpha.1 — package skeleton. **DEFERRED** to a future sprint with no committed timeline.

## Why deferred

The package name is reserved in the `@leapnux` scope, but the verb surface is intentionally undecided. Building leafnux without:

1. A cross-check against prior PM-platform features (autopsy of bloat),
2. Pull from at least one production adopter,
3. Clarity on which leaf-layer signals are OSS vs premium (hosted dashboards, multi-project rollups, account-bound alerting all naturally fit 6-NUX premium),

…would risk re-creating the bloat that motivated 5-NUX in the first place.

The OSS line is intentionally tight. Many "obvious" leafnux features may not belong here at all.

## Where this fits in 6-NUX

```
root → trunk → branch → LEAF (leafnux) → fruit → soil
```

leafnux is the **continuous health** layer — observability signals, CI/CD gates, dependabot, secrets-scan, performance trends, audit-log integrity. The day-to-day vital signs that keep the tree alive.

See [docs/6-NUX.md](https://github.com/StillNotBald/branchnux/blob/main/docs/6-NUX.md) for the artifact taxonomy and [docs/MOTTO.md](https://github.com/StillNotBald/branchnux/blob/main/docs/MOTTO.md) for the OSS/Premium product split.

## License

Apache-2.0 (c) 2026 Chu Ling
