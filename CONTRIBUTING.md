# Contributing to LeapNuX 5-NUX

Thank you for contributing. This is a 7-package npm-workspaces monorepo with strict hygiene rules. A few rules keep the project reliable, audit-defensible, and durably OSS.

> **Prefer to file an issue or discussion first** for any non-trivial change. The maintainer responds best to scoped, well-grounded proposals. Branding, license, or architectural changes will be redirected to GitHub Discussions for design input before implementation.

---

## DCO — Developer Certificate of Origin

LeapNuX uses DCO instead of a CLA. You attest that your contribution is your own work (or that you have the right to submit it) by signing off every commit:

```bash
git commit -s -m "feat(rootnux): add status export to CSV"
```

The `-s` flag appends a `Signed-off-by: Your Name <you@example.com>` line. Every commit in every PR must carry this. The DCO GitHub Action enforces it automatically — PRs with unsigned commits cannot merge.

The full DCO text is at https://developercertificate.org.

---

## Dev environment setup

**Requirements:** Node 20+, npm 9+ (workspaces).

```bash
git clone https://github.com/StillNotBald/branchnux.git
cd branchnux
npm install                # installs all 7 workspaces
npm test                   # runs each workspace's test script
npm run lint               # ESLint across workspaces (where configured)
```

To smoke-test individual CLIs locally:

```bash
npx rootnux --version
npx trunknux --version
npx branchnux --version
npx rootnux init           # scaffold artifacts in cwd
npx trunknux new-sprint demo
npx branchnux doctor       # check installed dependencies
```

### Working in one workspace

```bash
# Run only branchnux's tests
npm test --workspace @leapnux/branchnux

# Run only branchnux's lint
npm run lint --workspace @leapnux/branchnux

# Add a dep to one workspace
npm install --workspace @leapnux/rootnux some-dep
```

### Optional peer dependencies (branchnux LLM commands)

`branchnux discover / plan / codify / enrich` call the Anthropic API via `@anthropic-ai/sdk`. This is an **optional peer dependency** — it is not installed automatically to keep the base install lightweight.

```bash
# Install for local development
npm install --workspace @leapnux/branchnux @anthropic-ai/sdk

# Set your API key
export CLAUDE_API_KEY=sk-ant-...

# Smoke test
node packages/branchnux/bin/branchnux.mjs discover https://example.com --dry-run
```

Tests mock the SDK via `vi.mock` — they do not require a real API key and run correctly in CI without the package installed.

---

## Hygiene rules — non-negotiable

The OSS repo must NOT contain any employer / client / project / customer / industry-vertical names in committed content. The repo ships a hygiene-guard test (`packages/branchnux/test/cli.test.mjs`) that loads its banned-token list from a **gitignored** config (`packages/branchnux/test/.banned-tokens.json`).

If you have an internal-context word list you want to enforce locally, create the file with a JSON array of strings:

```bash
echo '["YourClient","YourEmployer","YourProject"]' > packages/branchnux/test/.banned-tokens.json
```

The file is `.gitignore`d, so it stays local. The test runs in CI with no banned list (passes trivially) and runs locally with your list (catches accidental leaks).

If a PR introduces an internal-context word, it WILL be requested to sanitize before merge.

---

## Architecture rules

1. **Cross-package contract.** NUX packages do NOT import each other. They communicate via file-system conventions in `@leapnux/6nux-core`. If you need shared logic, add it to `6nux-core` and import from there.

2. **Lockstep versioning.** All 8 package.jsons (root + 7 packages) share one version. Version bumps touch every file. Use the version-bump script in the release process; don't hand-bump one package.

3. **ESM-only, no build step.** `.mjs` source is the published artifact. No transpile, no bundler. Add neither without a maintainer-approved reason.

4. **File-system conventions.** Path constants live in `@leapnux/6nux-core/conventions`. If you find a hardcoded path string in a NUX package, that's a smell — extract it to conventions or import from there.

---

## Testing requirement

Every PR must ship with tests. This is not negotiable.

- New verbs → integration test in `packages/<nux>/test/<verb>.test.mjs`
- New parsers/renderers/utils → unit test in the package's test dir
- Bug fixes → a regression test that would have caught the bug
- Cross-package behavior → integration test at `tests/integration/` (planned location for v0.5+)

Run the full suite before opening a PR:

```bash
npm test
```

For branchnux Playwright/visual testing:

```bash
npm run test:e2e --workspace @leapnux/branchnux
```

Tests use `os.tmpdir()` + `fs.mkdtempSync` for filesystem isolation. No test should leave state behind.

---

## Code style

- ESLint configs are per-workspace (`packages/<nux>/eslint.config.mjs` where present).
- Apache 2.0 SPDX header on every new source file:
  ```js
  // Copyright (c) 2026 Chu Ling
  // SPDX-License-Identifier: Apache-2.0
  ```
- ESM throughout (`import`/`export`, `.mjs` for CLI entry points).
- Prefer named exports.
- Prefer explicit error messages (with file paths, line numbers, recovery actions) over silent failures.

---

## PR process

1. Open an issue first for any non-trivial change. Align on design before code.
2. Branch off `main`: `git checkout -b feat/<short-name>`.
3. Keep PRs focused — one feature or fix per PR.
4. Sign off every commit (`git commit -s`).
5. Fill in the PR template (summary, test plan, affected verbs/packages).
6. CI must be green before review. Tests + lint + DCO all gate merge.
7. At least one maintainer review required to merge.

### Conventional commit subjects

Use conventional-commit prefixes scoped to a package or layer:

```
feat(rootnux): add adr-new --status flag
fix(trunknux): handle git log with --no-merges in summarize
chore(6nux-core): bump KEBAB_RE to allow underscores
docs(architecture): update v0.5+ candidate verb list
test(branchnux): regression for sca-oscal control mapping
```

---

## Release process (maintainers)

1. Run full suite: `npm test`.
2. Bump versions across all 8 package.jsons (lockstep). Internal `@leapnux/*` cross-deps update too.
3. Run `npm install` at root to refresh the lockfile.
4. Run full suite again: `npm test`.
5. Commit: `chore(vN.N.N-alpha.N): <release summary>`.
6. Tag: `git tag -a vN.N.N-alpha.N -m "..."`.
7. Push: `git push origin main && git push origin vN.N.N-alpha.N`.
8. GitHub release: `gh release create vN.N.N-alpha.N --prerelease ...`.
9. (When npm scope is claimed) `npm publish --workspaces --access=public` with OTP.

---

## Labeling convention

| Label | Meaning |
|---|---|
| `good first issue` | Self-contained, well-scoped, no architectural decisions needed |
| `needs-design` | Requires discussion before implementation |
| `bug` | Reproducible defect with a test case |
| `breaking` | Changes that alter CLI flags, output format, file conventions, or schemas |
| `dogfood` | Issues found by running the OSS tools on this repo itself |
| `hygiene` | Internal-context leak risk; high priority |
| `package:rootnux` / `package:trunknux` / `package:branchnux` / `package:6nux-core` | Scope filter |

---

## Evidence-driven contribution guidance

These lessons come from real production use. Each one became a rule because the opposite burned time.

- **Write to `execution-log-auto.md`, never `execution-log.md`.** Curated narrative content has been overwritten by spec `afterAll` hooks. The `-auto` suffix tells the CLI which file it owns.
- **Test against `npm run build && npm start`, not `npm run dev`.** Hydration race conditions in dev mode cause spurious failures in form-submit tests.
- **Use `form.requestSubmit()` in Playwright, not `button.click()`.** React's synthetic event system requires `requestSubmit` to fire validation; `click` can fire before the handler attaches.
- **Rate-limit and lockout tests must run last.** Tests that trigger lockouts pollute subsequent tests. Annotate them with `// @rate-limit-test`; the lint rule moves them to end-of-file.
- **Per-test `X-Forwarded-For` headers isolate rate-limit buckets.** Sequential auth tests share a rate-limit bucket and trigger 429s. The spec template auto-generates `X-Forwarded-For: 10.0.0.<test-index>` per test. Trust the LAST proxy hop, never the first (OWASP IP-spoofing guidance).
- **Seed scripts must preserve secrets on partial failure.** Never null-out a known-good secret on enrollment failure. Read existing fixtures and merge results.
- **BLOCKED-IMPLEMENTATION and BLOCKED-CONFIG are first-class statuses.** Flag TCs as blocked rather than hiding them when the underlying feature is a stub or undeployed.
- **Append-only enrichment.** When enriching an existing test plan, append new sections. Never rewrite existing content.
- **One agent per slug.** When running parallel agents, never have two agents touch the same test-plan or sprint folder.

---

## Questions

Open a GitHub Discussion if you're not sure whether something is in scope or how to approach a change. Issues are for bugs and confirmed feature requests.
