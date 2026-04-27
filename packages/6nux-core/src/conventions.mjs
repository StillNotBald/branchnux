// File-system conventions shared across the 6-NUX product family.
// Packages cooperate via these path/format conventions, NOT via cross-imports.
//
// Status: v0.4.0-alpha.1 placeholder. Real values will be filled in as each
// NUX package extracts its conventions during v0.4.x.

export const PATHS = {
  requirements: 'requirements/REQUIREMENTS.md',
  traceability: 'requirements/TRACEABILITY.md',
  validations: 'requirements/validations/',
  sprintLog: 'sprint-log/',
  testingLog: 'testing-log/',
  adrs: 'docs/adr/',
  risks: 'requirements/risks/',
  governance: 'docs/governance/',
};

export const SCHEMAS = {
  // Schema versions — bump these when breaking schema changes ship
  rxx: 'v1',
  adr: 'v1',
  sprintFolder: 'v1',
  testPlan: 'v1',
  rtm: 'v1',
};
