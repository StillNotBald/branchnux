# @leapnux/trunknux

Build-layer CLI for the 6-NUX taxonomy. Manages sprint scaffolding, build narratives, summaries.

**Status:** v0.4.0-alpha.1 — package skeleton. Verbs ship in **v0.4.2**.

## Planned verbs (v0.4.2)

```
trunknux new-sprint <slug>      # create date-prefixed sprint-log/<date>_<slug>/ folder
trunknux summarize              # generate SPRINT_SUMMARY.md from git log
trunknux lint                   # verify sprint folder structure conventions
```

## Where this fits

trunknux is the **build layer** of the 6-NUX taxonomy:

```
root → TRUNK (trunknux)  → branch → leaf → fruit → soil
```

It captures *what was actually grown* — sprint summaries, commit narratives, build artifacts.

## Install

```sh
npm install -g @leapnux/trunknux       # just trunknux
npm install -g @leapnux/5nux           # full 5-NUX OSS stack
```

## License

Apache-2.0 (c) 2026 Chu Ling
