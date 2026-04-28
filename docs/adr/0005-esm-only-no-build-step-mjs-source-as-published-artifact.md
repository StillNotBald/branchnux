---
adr: 0005
title: "ESM-only, no build step (.mjs source as published artifact)"
status: accepted
date: 2026-04-28
---

# ADR-0005: ESM-only, no build step (.mjs source as published artifact)

## Status

accepted

## Context

Deciding the build pipeline for packages that are published to npm. Options:

| Option | Build artifact | Complexity |
|---|---|---|
| TypeScript + `tsc` | `dist/*.js` + `.d.ts` | Transpile step, tsconfig, source maps, `types` field in package.json |
| TypeScript + `tsup` / `esbuild` | Bundled `dist/*.js` | Bundler config, external declarations, source map drift |
| Babel transpile | `dist/*.js` | Babel config, plugin chain, polyfills |
| ESM source `.mjs`, no build | Source = artifact | No build tooling at all |

Key facts at decision time:

- 5-NUX is a CLI tool, not a browser library. No bundle size pressure.
- Target runtime: Node 20+. Native ESM support is stable in Node 12+; by 2026,
  Node 20 is the LTS and CJS interop is not a blocker for CLI tools.
- The packages are small and focused. No hot path that benefits from bundling.
- All source files are already `.mjs` (ECMAScript module syntax). The
  TypeScript value-add would be type-checking; we can achieve that with JSDoc
  + `@ts-check` without a compile step if needed.
- A build step adds: a CI task that can fail for non-semantic reasons (version
  drift in tsc, tsup config changes), a `dist/` directory to keep in sync,
  source map drift when debugging stack traces.

## Decision

ESM-only `.mjs` source. Node 20+ required. No transpile, no bundle, no `dist/`.

- All source files use `.mjs` extension and `import`/`export` syntax.
- `package.json` `"main"` and `"exports"` point directly at source files
  (e.g. `"./src/index.mjs"`).
- No `types` field — no TypeScript declarations generated.
- `"engines": { "node": ">=20.0.0" }` in every package.json.
- Stack traces in production point directly at repository source paths.

## Consequences

**Better:**

- Zero build complexity. Contributors `git clone` + `npm install` + run tests.
  No `npm run build` step needed before tests or local dev.
- Trivial debugging: a stack trace frame like `at runAdrNew
  (packages/rootnux/src/commands/adr-new.mjs:87)` maps to exactly that line in
  the repo, no source map required.
- No source map drift — a class of "works in dev, breaks in prod" bugs that
  comes from stale or missing `.map` files.
- Published npm package has no hidden `dist/` that could diverge from source.
  What you see in the repo is what runs.

**Worse / trade-offs:**

- Incompatible with CommonJS consumers. `require('@leapnux/rootnux')` will fail.
  For a 2026 CLI tool targeting developers who use Node 20+, this is acceptable.
  If a consumer is genuinely blocked, dual CJS+ESM builds are the migration
  path (add without removing ESM).
- No TypeScript static types or `.d.ts` declarations shipped with the package.
  IDE autocompletion relies on JSDoc annotations. Contributors who want
  type-checking add `// @ts-check` at file top.

**Risks:**

- A future use case (e.g. browser-based dashboard consuming 5-NUX core
  utilities) might require bundling. At that point the correct decision is to
  add a build target for that specific use case, not to change the source
  format. The `.mjs` source remains canonical.
