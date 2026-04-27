// trunknux new-sprint <slug>
// Creates a date-prefixed sprint folder in sprint-log/ of the cwd.

import fs from 'node:fs';
import path from 'node:path';

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function todayISO() {
  // Use local date (not UTC) to match the user's calendar day.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Title-case a kebab slug: "my-sprint" → "My Sprint" */
function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildReadme(slug, date) {
  return `---
sprint: ${slug}
date: ${date}
status: in-progress
---
# Sprint: ${titleCase(slug)}

**Date started:** ${date}
**Status:** in progress

## Goal

<What this sprint aims to deliver. One paragraph.>

## Scope

- [ ] Item 1
- [ ] Item 2

## Out of scope

-

## Decisions made

-

## Outcome

<Filled in at sprint close. Run \`trunknux summarize\` to auto-generate a SPRINT_SUMMARY.md from git log.>
`;
}

/**
 * @param {string} slug
 * @param {{ readme?: boolean, cwd?: string }} opts
 *   readme defaults to true (commander --no-readme sets it false)
 */
export function newSprint(slug, opts = {}) {
  const readme = opts.readme !== false;
  const cwd = opts.cwd ?? process.cwd();

  // Validate slug
  if (!KEBAB_RE.test(slug)) {
    console.error(
      `Error: slug "${slug}" is not valid kebab-case. ` +
        'Use lowercase letters, digits, and hyphens only (e.g. "my-sprint-1").'
    );
    process.exit(1);
  }

  const date = todayISO();
  const folderName = `${date}_${slug}`;
  const sprintLogDir = path.join(cwd, 'sprint-log');
  const sprintDir = path.join(sprintLogDir, folderName);
  const readmePath = path.join(sprintDir, 'README.md');

  // Idempotency check
  if (fs.existsSync(sprintDir)) {
    console.log(`Sprint folder already exists at ${sprintDir}`);
    process.exit(0);
  }

  // Create sprint-log/ if needed, then the sprint folder
  try {
    fs.mkdirSync(sprintDir, { recursive: true });
  } catch (err) {
    console.error(`Error: could not create sprint folder ${sprintDir}: ${err.message}`);
    process.exit(1);
  }

  if (readme) {
    try {
      fs.writeFileSync(readmePath, buildReadme(slug, date), 'utf8');
    } catch (err) {
      console.error(`Error: could not write README at ${readmePath}: ${err.message}`);
      process.exit(1);
    }
    console.log(`Created sprint folder: ${sprintDir}`);
    console.log(`Created README:        ${readmePath}`);
  } else {
    console.log(`Created sprint folder: ${sprintDir}`);
  }

  process.exit(0);
}
