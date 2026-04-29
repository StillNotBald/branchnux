// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * src/lib/validate-surface.mjs
 *
 * Shared surface-name validation helper.
 *
 * A "surface" is a kebab-case identifier used as a directory name when resolving
 * paths like path.resolve(outDir, surface).  Validating the surface against a
 * strict allow-list regex prevents path-traversal attacks such as:
 *
 *   branchnux sign ../../etc/cron.d
 *   branchnux sign pdf ../../../root
 *
 * All callers that resolve user-supplied surface names to file-system paths MUST
 * call validateSurface() before doing so.
 *
 * Valid examples:  "login", "2026-04-26-login", "br01", "my-surface"
 * Invalid:         "../foo", "..\\foo", "foo/bar", "foo bar", "FOO", "foo..bar"
 */

/**
 * Assert that `surface` is a valid kebab-case surface identifier.
 *
 * Allowed pattern: one or more lowercase-alphanumeric segments separated by
 * single hyphens.  No path separators, dots, spaces, or uppercase are accepted.
 *
 * @param {string} surface
 * @throws {Error} with exitCode 2 if the surface name is invalid
 */
export function validateSurface(surface) {
  if (!surface || typeof surface !== 'string') {
    throw exitError('surface is required', 2);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(surface)) {
    throw exitError(
      `surface must be lowercase-kebab-case (only a-z, 0-9, hyphens). Got: "${surface}"`,
      2,
    );
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function exitError(message, code) {
  const err = new Error(message);
  err.exitCode = code;
  return err;
}
