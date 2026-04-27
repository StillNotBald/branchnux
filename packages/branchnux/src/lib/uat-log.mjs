// Copyright (c) 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * src/lib/uat-log.mjs
 *
 * Hash-chained, append-only UAT sign-off log.
 *
 * Each JSONL line is a sign-off entry:
 *   { tc_id, status, reviewer, reviewer_role, justification,
 *     ts, prev_hash, signature }
 *
 * The chain guarantee:
 *   prev_hash — HMAC-SHA256 of the raw JSON string of the previous entry
 *   signature — HMAC-SHA256 of (tc_id + "|" + status + "|" + reviewer + "|" + ts)
 *
 * Both MACs use the project's UAT_SECRET env var.
 *
 * Chain integrity means:
 *   - Entries cannot be removed without detection (prev_hash breaks).
 *   - Individual entries cannot be altered without detection (signature breaks).
 *   - Replay is detectable via timestamp ordering.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Append a signed, hash-chained entry to a JSONL log file.
 *
 * @param {string} jsonlPath  - absolute or relative path to the .jsonl file
 * @param {object} entry      - { tc_id, status, reviewer, reviewer_role, justification? }
 * @param {string} secret     - HMAC secret (typically process.env.UAT_SECRET)
 * @returns {object}          - the full entry that was written (with ts, prev_hash, signature)
 */
export function appendEntry(jsonlPath, entry, secret) {
  if (!secret) throw new UatLogError('UAT_SECRET is required for signing log entries', 2);
  if (!entry.tc_id) throw new UatLogError('entry.tc_id is required', 2);
  if (!entry.status) throw new UatLogError('entry.status is required', 2);
  if (!entry.reviewer) throw new UatLogError('entry.reviewer is required', 2);
  if (!entry.reviewer_role) throw new UatLogError('entry.reviewer_role is required', 2);

  // Ensure directory exists
  fs.mkdirSync(path.dirname(path.resolve(jsonlPath)), { recursive: true });

  const ts = new Date().toISOString();
  const prevHash = _computePrevHash(jsonlPath, secret);

  const sigInput = [entry.tc_id, entry.status, entry.reviewer, ts].join('|');
  const signature = hmac(secret, sigInput);

  const fullEntry = {
    tc_id: entry.tc_id,
    status: entry.status,
    reviewer: entry.reviewer,
    reviewer_role: entry.reviewer_role,
    justification: entry.justification ?? '',
    ts,
    prev_hash: prevHash,
    signature,
  };

  fs.appendFileSync(jsonlPath, JSON.stringify(fullEntry) + '\n', 'utf-8');
  return fullEntry;
}

/**
 * Walk the entire log and verify chain integrity.
 *
 * @param {string} jsonlPath  - path to the .jsonl file
 * @param {string} secret     - HMAC secret
 * @returns {{ valid: boolean, brokenAt: number | null, errors: string[] }}
 */
export function verifyChain(jsonlPath, secret) {
  if (!secret) throw new UatLogError('UAT_SECRET is required for chain verification', 2);

  const lines = readLines(jsonlPath);
  if (lines.length === 0) return { valid: true, brokenAt: null, errors: [] };

  const errors = [];
  let prevRawJson = null; // raw JSON string of the previous entry

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      errors.push(`Line ${i + 1}: JSON parse error`);
      return { valid: false, brokenAt: i + 1, errors };
    }

    // Verify prev_hash
    const expectedPrevHash = prevRawJson === null
      ? _emptyHash(secret)
      : hmac(secret, prevRawJson);

    if (entry.prev_hash !== expectedPrevHash) {
      errors.push(
        `Line ${i + 1} (${entry.tc_id}): prev_hash mismatch — chain broken. ` +
        `Expected ${expectedPrevHash.slice(0, 8)}… got ${String(entry.prev_hash).slice(0, 8)}…`
      );
      return { valid: false, brokenAt: i + 1, errors };
    }

    // Verify signature
    const sigInput = [entry.tc_id, entry.status, entry.reviewer, entry.ts].join('|');
    const expectedSig = hmac(secret, sigInput);
    if (entry.signature !== expectedSig) {
      errors.push(
        `Line ${i + 1} (${entry.tc_id}): signature mismatch — entry may have been tampered.`
      );
      return { valid: false, brokenAt: i + 1, errors };
    }

    prevRawJson = raw;
  }

  return { valid: true, brokenAt: null, errors };
}

/**
 * Return the most recent log entry for a given TC-ID (or null if none).
 *
 * @param {string} jsonlPath
 * @param {string} tcId
 * @returns {object | null}
 */
export function getLatest(jsonlPath, tcId) {
  const lines = readLines(jsonlPath);
  let latest = null;
  for (const raw of lines) {
    try {
      const entry = JSON.parse(raw);
      if (entry.tc_id === tcId) latest = entry;
    } catch {
      // skip malformed lines
    }
  }
  return latest;
}

// ── Internals ─────────────────────────────────────────────────────────────────

/**
 * HMAC-SHA256 hex digest using Node's built-in crypto module.
 * No external dependencies.
 *
 * @param {string} secret
 * @param {string} data
 * @returns {string} hex digest
 */
export function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data, 'utf-8').digest('hex');
}

/**
 * The prev_hash for the very first entry in a log is HMAC of the empty string.
 * This is a deterministic sentinel — verifiers reproduce it without state.
 */
function _emptyHash(secret) {
  return hmac(secret, '');
}

/**
 * Compute the prev_hash that the NEXT entry should record.
 * If the file doesn't exist or is empty, returns the empty-hash sentinel.
 */
function _computePrevHash(jsonlPath, secret) {
  const lines = readLines(jsonlPath);
  if (lines.length === 0) return _emptyHash(secret);
  // prev_hash = HMAC of the raw JSON string of the last line (not the parsed object).
  const lastRaw = lines[lines.length - 1];
  return hmac(secret, lastRaw);
}

/**
 * Read a JSONL file and return non-empty, non-schema lines.
 * Returns [] if file does not exist.
 */
function readLines(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) return [];
  return fs
    .readFileSync(jsonlPath, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('{"_schema"'));
}

// ── Error class ───────────────────────────────────────────────────────────────

class UatLogError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'UatLogError';
    this.exitCode = exitCode;
  }
}
