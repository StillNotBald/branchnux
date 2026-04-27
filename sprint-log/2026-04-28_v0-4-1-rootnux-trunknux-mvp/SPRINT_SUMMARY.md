---
sprint: v0-4-1-rootnux-trunknux-mvp
date_range: 2026-04-27 .. 2026-04-28
commit_count: 32
---
# Sprint Summary: v0-4-1-rootnux-trunknux-mvp

**Range:** 2026-04-27 → 2026-04-28
**Commits:** 32

## Features
- 3a464a5 feat(industry): add malaysia-banking standards bundle (30 controls) (Chu Ling, 2026-04-27)
- 0af502b feat(v0.2): port report generator (P1) + per-env (P3) + visual regression (P4) (Chu Ling, 2026-04-27)
- 650b949 feat(v0.2): signoff suite -- PDF, stale-check, OSCAL log, LLM-justify, multi-reviewer (Chu Ling, 2026-04-27)
- 9f83c31 feat(v0.2): wire LLM agent suite (plan/codify/enrich/batch + eval harness) (Chu Ling, 2026-04-27)

## Fixes
- dcf6f93 fix: smoke-test polish — wire demo, ship examples, drop stale CLI tags (Chu Ling, 2026-04-27)
- 2cc5a6f fix(deps): regenerate package-lock.json (was missing pixelmatch transitive deps) (Chu Ling, 2026-04-27)

## Docs
- 23ffd8d docs: trim CLAUDE.md to <60 lines, move long-form to docs/ai-assistant-guide.md (Chu Ling, 2026-04-27)
- bb09714 docs: add CLAUDE.md — instructions for AI assistants using TrunkNuX (Chu Ling, 2026-04-27)
- 1f74673 docs(readme): reframe under 'testing-to-audit journey' thesis (lane B) (Chu Ling, 2026-04-27)
- 5af279b docs(readme): expand competition section to 3 lanes (GRC / test-mgmt / OSS reporters) (Chu Ling, 2026-04-27)
- 4db5242 docs(readme): brutal-review polish + business-user reframe (Chu Ling, 2026-04-27)
- 381f683 docs(release): update NEXT_STEPS for v0.2.1 (Chu Ling, 2026-04-27)
- f8c6789 docs(release): update NEXT_STEPS for v0.2.0 stable (Chu Ling, 2026-04-27)
- a3c75af docs(readme): disclaimer + audience guide + reframe + 7-config standards table (Chu Ling, 2026-04-27)
- 70b3f15 docs(readme): reflect v0.2.0-alpha.1 shipped state (Chu Ling, 2026-04-27)

## Chores
- ae388e4 chore(v0.4.0-alpha.1): migrate to npm-workspaces monorepo for 5-NUX (Chu Ling, 2026-04-28)
- 1a5f9c2 chore(v0.3.0-alpha.1): rename trunknux → branchnux + 6-NUX framework (Chu Ling, 2026-04-27)
- 5375139 chore: dogfood pass — TrunkNuX evidence chain for v0.2.2 (Chu Ling, 2026-04-27)
- 306ff85 chore(v0.2.2): rename testnux → trunknux + lane B commitment (Chu Ling, 2026-04-27)
- c6e2d8a chore(release): v0.2.1 (Chu Ling, 2026-04-27)
- b0ddd4d chore(deps-dev): bump eslint + @eslint/js to v10 (combined) (#12) (StillNotBald, 2026-04-27)
- 35744ad chore(release): v0.2.0 stable (Chu Ling, 2026-04-27)
- 8437726 chore(ci): Bump actions/setup-node from 4.4.0 to 6.4.0 (#2) (dependabot[bot], 2026-04-27)
- e567346 chore(ci): Bump actions/checkout from 4.3.1 to 6.0.2 (#1) (dependabot[bot], 2026-04-27)
- 441c805 chore(v0.2): release 0.2.0-alpha.1 -- CLI wiring, real demo, polish, CHANGELOG (Chu Ling, 2026-04-27)
- 34140e0 chore(v0.2): gitignore Playwright test artifacts (Chu Ling, 2026-04-27)

## Other
- bdfb8ed chore(deps)(deps): Bump commander from 12.1.0 to 14.0.3 (#10) (dependabot[bot], 2026-04-27)
- 8084659 chore(deps)(deps): Bump marked from 12.0.2 to 18.0.2 (#6) (dependabot[bot], 2026-04-27)
- 9920939 chore(deps)(deps-dev): Bump @anthropic-ai/sdk (#3) (dependabot[bot], 2026-04-27)
- 4aef8de chore(deps)(deps): Bump sharp from 0.33.5 to 0.34.5 (#7) (dependabot[bot], 2026-04-27)
- b772ebc ci(dco): use pull_request.user.login (not github.actor) for dependabot exemption (Chu Ling, 2026-04-27)
- f88e482 ci(dco): exempt dependabot[bot] from sign-off check (Chu Ling, 2026-04-27)
