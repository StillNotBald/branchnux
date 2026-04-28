// @leapnux/6nux-core — shared core for the 6-NUX product family
//
// Status: shared utilities populated as of v0.4.2-alpha.1 (conventions, ids, utils).
// Validators + schemas remain placeholders pending v0.5+. See docs/ARCHITECTURE.md.

export const VERSION = '0.4.3-alpha.1';
export const STATUS = 'active';

export * from './conventions.mjs';
export * from './schemas.mjs';
export * from './ids.mjs';
export * from './utils.mjs';
// validators.mjs is intentionally NOT re-exported here. Stub functions
// that throw 'not yet implemented' must not appear in the public API.
// Validators planned for v0.6.0+; see validators.mjs for details.
