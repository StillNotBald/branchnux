# @leapnux/rootnux

Intent-layer CLI for the 6-NUX taxonomy. Manages requirements (R-XX), ADRs, decisions, risks.

**Status:** v0.4.0-alpha.1 — package skeleton. Verbs ship in **v0.4.1**.

## Planned verbs (v0.4.1)

```
rootnux init                    # scaffold requirements/REQUIREMENTS.md + TRACEABILITY.md
rootnux lint                    # validate R-XX schema + cross-links
rootnux adr-new <title>         # scaffold a new ADR with sequential numbering
rootnux risk-add                # append to risk register
rootnux status                  # show DONE/BLOCKED/DECLINED/DEFERRED counts
```

## Where this fits

rootnux is the **intent layer** of the 6-NUX taxonomy:

```
ROOT (rootnux)  → trunk → branch → leaf → fruit → soil
```

It captures *why* the product is what it is — specs, decisions, declined-by-design rationales, risk register, governance docs.

See the [6-NUX taxonomy doc](https://github.com/StillNotBald/branchnux) for the full picture.

## Install

```sh
npm install -g @leapnux/rootnux       # just rootnux
npm install -g @leapnux/5nux           # full 5-NUX OSS stack
```

## License

Apache-2.0 (c) 2026 Chu Ling
