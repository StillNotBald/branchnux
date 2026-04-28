// Validators for 6-NUX artifacts. Used by all NUX packages to verify their
// inputs match the shared schemas.
//
// Validators ship in v0.6.0+. Until then, importers should use file-system
// conventions in PATHS instead.
//
// These functions are intentionally NOT exported from the top-level barrel
// (index.mjs) to avoid shipping a runtime bomb to consumers. They live here
// so that the import path '@leapnux/6nux-core/validators' does not 404 for
// upgraders who are ahead of the stable API.
