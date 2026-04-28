# @leapnux/leafnux

Continuous-internal-health layer of the 6-NUX taxonomy.

**Status:** v0.4.2-alpha.1 — package skeleton. **DEFERRED** to a future sprint with no committed timeline.

## Why deferred

The package name is reserved in the `@leapnux` scope, but the verb surface is intentionally undecided. Building leafnux without:

1. Pull from at least one real adopter running 5-NUX in production,
2. Clarity on which leaf-layer signals are OSS vs premium (hosted dashboards, multi-project rollups, account-bound alerting all naturally fit 6-NUX premium),
3. A first-principles design that doesn't import assumptions from any specific industry,

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

## Part of the 5-NUX family

Sibling packages: [rootnux](../rootnux), [trunknux](../trunknux), [branchnux](../branchnux), [leafnux](../leafnux), [fruitnux](../fruitnux), [6nux-core](../6nux-core), [5nux meta](../5nux). See the [root README](../../README.md) for the full taxonomy and install instructions.
