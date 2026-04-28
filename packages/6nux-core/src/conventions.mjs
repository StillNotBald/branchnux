// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

// File-system conventions shared across the 6-NUX product family.

export const PATHS = {
  requirements: 'requirements/REQUIREMENTS.md',
  traceability: 'requirements/TRACEABILITY.md',
  risksDir: 'requirements/risks',
  risks: 'requirements/risks/risks.md',
  validations: 'requirements/validations/',
  sprintLog: 'sprint-log/',
  testingLog: 'testing-log/',
  adrs: 'docs/adr/',
  governance: 'docs/governance/',
  kb: 'docs/KNOWLEDGE_BASE.md',
};

export const SCHEMAS = { rxx: 'v1', adr: 'v1', sprintFolder: 'v1', testPlan: 'v1', rtm: 'v1' };

// Slug + folder validation regexes
export const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DATE_SLUG_RE = /^(\d{4}-\d{2}-\d{2})_(.+)$/;
export const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Status taxonomy
export const STATUSES = ['DONE', 'BLOCKED', 'PARTIAL', 'NOT STARTED', 'DECLINED', 'DEFERRED', 'FAKE'];
