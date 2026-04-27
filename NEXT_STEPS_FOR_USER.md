# v0.2.0 stable — manual step for you

**Date:** 2026-04-27
**Status:** v0.2.0 stable is tagged on GitHub, marked Latest. Code, README, CHANGELOG, tests all green. **Only one thing left: publish to npm.**

## TL;DR

- ✅ **Code:** v0.2.0 on `main`, 370/370 tests pass, 0 lint errors, 0 leak markers.
- ✅ **GitHub:** `v0.2.0` tagged + released, marked **Latest** (replaces v0.2.0-alpha.1 as the visible release).
- ✅ **README:** disclaimer + audience guide + 7-config standards table + alpha→stable framing flipped.
- ✅ **Industry standards:** new `malaysia-banking` bundle (30 controls — PDPA + BNM RMiT + CSA 2024 + BNM e-Banking).
- ⏳ **npm:** Still on `0.1.1` as `latest`, `0.2.0-alpha.1` as `alpha`. You need to publish `0.2.0` (needs OTP).

## What you need to do

### 1. Verify locally

```bash
cd "C:/Users/Chu Ling/Desktop/Projects/testnux"
git log --oneline -5            # should show v0.2.0 commits at top
git tag -l v0.2.0                # should print "v0.2.0"
node bin/testnux.mjs --version   # should print "0.2.0"
npm test                         # 370 passed
```

GitHub release page: <https://github.com/StillNotBald/testnux/releases/tag/v0.2.0>

### 2. Publish 0.2.0 to npm as `latest`

```bash
cd "C:/Users/Chu Ling/Desktop/Projects/testnux"
npm publish --otp=<6-digit-code-from-authenticator-or-recovery>
```

**Notes:**

- **No `--tag` flag.** Without it, npm publishes to the `latest` dist-tag (default behavior). This is what we want — `npm install testnux` (no tag) becomes 0.2.0.
- After publish: `npm view testnux version` should return `0.2.0` (was `0.1.1`).
- After publish: `npm view testnux dist-tags` should show `{ latest: '0.2.0', alpha: '0.2.0-alpha.1' }`.
- The `alpha` dist-tag still pins to `0.2.0-alpha.1` for users who pinned to `@alpha`. They'll keep getting that until you bump the alpha tag (you don't need to — they should follow `latest` from here).

### 3. Smoke test before announcing (recommended)

```bash
mkdir /tmp/testnux-020-smoke && cd /tmp/testnux-020-smoke
npm install testnux           # no tag → gets 0.2.0
npx testnux --version         # should print 0.2.0
npx testnux init my-page --industry malaysia-banking
ls testing-log/               # should have 2026-04-27_my-page/
```

If anything breaks, you can publish a `0.2.1` patch quickly without affecting users still on `0.1.1` (they're on a separate major-zero line they don't auto-upgrade across).

### 4. Optional: announce

- Tweet/LinkedIn/etc — link to <https://github.com/StillNotBald/testnux/releases/tag/v0.2.0>
- The README disclaimer block is intentionally prominent — share that paragraph if you want to set expectations clearly: "TestNUX automates the mechanics. Humans own the decisions."

## What changed from v0.2.0-alpha.1 to v0.2.0

This is **not** a content gap — alpha was already feature-complete. The stable release adds:

- **`--industry malaysia-banking`** — 30 controls covering Malaysian banking + financial services regulations (PDPA, BNM RMiT, Cyber Security Act 2024, BNM e-Banking Guidelines)
- **README disclaimer block** — explicit statement that TestNUX reduces workload but does not replace human judgment; auditors hold the user accountable, not the tool
- **README "Which output do I read?" section** — maps each artifact (test-plan.md, spec.ts, evidence/*.png, execution-report.html, .xlsx, sca/*.md, uat-log.jsonl, TRACEABILITY.md, oscal-assessment.json, visual-baseline/) to its primary audience
- **README TL;DR reframed** — TestNUX is a multi-phase test discipline, not just a report generator; honest scope on headcount reduction
- **README industry standards** — corrected to list all 7 bundles (general, ecommerce, edu, fintech, gov, healthcare, malaysia-banking) instead of incorrectly stating only `general` ships
- **Tests:** 365 → 370 (5 new for the malaysia-banking bundle)
- Alpha → stable framing flipped throughout README, CHANGELOG, install snippets

## Still on the to-do list (v0.2.x patch releases)

- Eval harness coverage expansion: 3 fixture pages today, target 10+ real customer pages
- Risky dependabot bumps to triage: `@anthropic-ai/sdk` 0.39 → 0.91, `eslint` 9 → 10, `marked` 12 → 18, `commander` 12 → 14 (PRs #3, #5, #6, #8, #10 still open)
- gstack `/testnux` skill bundle for the official catalog (planned v0.3)
