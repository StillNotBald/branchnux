# @leapnux/5nux — the OSS LeapNuX stack

Meta-package that installs the **active** 5-NUX CLIs in one command. The 2 reserved-skeleton packages (leafnux, fruitnux) are listed as optional dependencies — they install too, but their CLIs only print a "skeleton — deferred" message until real verbs ship.

| Package | Layer | Status |
|---|---|---|
| [@leapnux/rootnux](../rootnux) | Intent (specs, ADRs, risks) | active |
| [@leapnux/trunknux](../trunknux) | Build (sprint scaffolding) | active |
| [@leapnux/branchnux](../branchnux) | Verification (test plans, RTM, SCA) | active |
| [@leapnux/leafnux](../leafnux) | Continuous health | reserved skeleton (optional dep) |
| [@leapnux/fruitnux](../fruitnux) | External deliverables | reserved skeleton (optional dep) |

## Install

```sh
npm install -g @leapnux/5nux
```

Equivalent to:
```sh
npm install -g @leapnux/rootnux @leapnux/trunknux @leapnux/branchnux
# leafnux + fruitnux installed as optionalDependencies (skeleton CLIs)
```

## What you get

After install, three working CLIs land on your `PATH`:

```
rootnux init                    # scaffold REQUIREMENTS.md / TRACEABILITY.md / risks/ / docs/adr/
trunknux new-sprint <slug>      # date-prefixed sprint folder
branchnux init <surface>        # testing-log/<date>_<surface>/ scaffold
```

Plus 5+ more verbs per package. Run `<verb> --help` for full surface.

## What's deferred

`leafnux` (continuous health) and `fruitnux` (external deliverables) are **reserved skeletons** — their CLIs print a "DEFERRED — future sprint" message. They install with the meta-package so namespaces are claimed, but no real work runs until v0.5+ candidate verbs ship (see [docs/ARCHITECTURE.md](https://github.com/StillNotBald/branchnux/blob/main/docs/ARCHITECTURE.md) v0.5+ section).

## What about the 6th node?

The 6-NUX taxonomy includes a **soilnux** node (infrastructure, vendors, IaC, on-call, multi-user workflows). That ships as a separate **commercial product** under a future 6-NUX commercial license — not part of the OSS 5-NUX stack. See [docs/MOTTO.md](https://github.com/StillNotBald/branchnux/blob/main/docs/MOTTO.md) for the OSS / Premium split.

## Part of the 5-NUX family

This is the meta-package. Sibling packages: [rootnux](../rootnux), [trunknux](../trunknux), [branchnux](../branchnux), [leafnux](../leafnux), [fruitnux](../fruitnux), [6nux-core](../6nux-core).

## License

Apache-2.0 (c) 2026 Chu Ling
