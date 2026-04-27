# @leapnux/5nux — the OSS LeapNuX stack

Meta-package that installs the full **5-NUX** OSS stack in one command:

| Package | Layer | Status |
|---|---|---|
| [@leapnux/rootnux](../rootnux) | Intent (specs, ADRs, risks) | v0.4.1 |
| [@leapnux/trunknux](../trunknux) | Build (sprint scaffolding) | v0.4.2 |
| [@leapnux/branchnux](../branchnux) | Verification (test plans, RTM, SCA) | **shipping** |
| [@leapnux/leafnux](../leafnux) | Continuous health | v0.5.0 |
| [@leapnux/fruitnux](../fruitnux) | External deliverables | v0.5.0 |

## Install

```sh
npm install -g @leapnux/5nux
```

Equivalent to:
```sh
npm install -g @leapnux/rootnux @leapnux/trunknux @leapnux/branchnux @leapnux/leafnux @leapnux/fruitnux
```

## What about the 6th node?

The 6-NUX taxonomy includes a **soilnux** node (infrastructure, vendors, IaC, on-call, DPAs). That ships as a separate **commercial product** — not part of the OSS 5-NUX stack. See the [LeapNuX brand strategy](../../docs/6-NUX.md) for context.

## License

Apache-2.0 (c) 2026 Chu Ling
