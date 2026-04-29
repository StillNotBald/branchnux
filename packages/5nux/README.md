# @leapnux/5nux — the OSS LeapNuX stack

Meta-package that installs all 5 active 5-NUX CLIs in one command. Each NUX node serves a different stage of the regulated-software lifecycle, and they all install together.

| Package | Layer | Status |
|---|---|---|
| [@leapnux/rootnux](https://www.npmjs.com/package/@leapnux/rootnux) | Intent (specs, ADRs, risks, KB) | active |
| [@leapnux/trunknux](https://www.npmjs.com/package/@leapnux/trunknux) | Build (sprint scaffolding, summaries, log) | active |
| [@leapnux/branchnux](https://www.npmjs.com/package/@leapnux/branchnux) | Verification (test plans, reports, LLM planning) | active (~14 verbs) |
| [@leapnux/fruitnux](https://www.npmjs.com/package/@leapnux/fruitnux) | External deliverables (SCA, OSCAL, sign, RTM, BR) | active (promoted in v0.6, 11 verbs) |
| [@leapnux/leafnux](https://www.npmjs.com/package/@leapnux/leafnux) | Continuous health (RAG-status snapshot) | active |
| [@leapnux/6nux-core](https://www.npmjs.com/package/@leapnux/6nux-core) | Shared library (conventions, IDs, utils) | active |

## Install

```sh
npm install -g @leapnux/5nux
```

Equivalent to:
```sh
npm install -g @leapnux/rootnux @leapnux/trunknux @leapnux/branchnux @leapnux/leafnux @leapnux/fruitnux
# 6nux-core installs as a transitive dependency
```

## What you get

After install, five working CLIs land on your `PATH`:

```
rootnux init                    # scaffold REQUIREMENTS.md / TRACEABILITY.md / risks/ / docs/adr/
trunknux new-sprint <slug>      # date-prefixed sprint folder
branchnux init <surface>        # testing-log/<date>_<surface>/ scaffold
branchnux plan <surface>        # AI-drafted test plan with [VERIFY] markers
fruitnux rtm                    # regenerate requirements/TRACEABILITY.md
fruitnux sca generate <surface> # fill SCA evidence rows from test results
fruitnux sign <surface>         # HMAC-chained UAT sign-off
leafnux health                  # RAG-status snapshot of project state
```

Plus 10+ more verbs across the chain. Run `<verb> --help` for full surface or see [docs/reference.md](https://github.com/leapnux/5nux/blob/main/docs/reference.md).

## What about the 6th node?

The 6-NUX taxonomy includes a **soilnux** node (infrastructure, vendors, IaC, on-call, multi-user workflows). That ships as a separate **commercial product** under the 6-NUX commercial license — not part of the OSS 5-NUX stack. See [docs/MOTTO.md](https://github.com/leapnux/5nux/blob/main/docs/MOTTO.md) for the OSS / Premium split.

## Part of the 5-NUX family

This is the meta-package. Sibling packages: [rootnux](https://www.npmjs.com/package/@leapnux/rootnux), [trunknux](https://www.npmjs.com/package/@leapnux/trunknux), [branchnux](https://www.npmjs.com/package/@leapnux/branchnux), [leafnux](https://www.npmjs.com/package/@leapnux/leafnux), [fruitnux](https://www.npmjs.com/package/@leapnux/fruitnux), [6nux-core](https://www.npmjs.com/package/@leapnux/6nux-core). See the [root README](https://github.com/leapnux/5nux#readme) for the full taxonomy and install instructions.

## License

Apache-2.0 (c) 2026 Chu Ling
