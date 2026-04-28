// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * src/lib/uat-log.mjs
 *
 * Hash-chained, append-only UAT sign-off log.
 *
 * Each JSONL line is a sign-off entry:
 *   { tc_id, status, reviewer, reviewer_role, justification,
 *     ts, prev_hash, signature, signature_version }
 *
 * Signature versions:
 *   v1 (legacy): signature = HMAC-SHA256(secret, "tc_id|status|reviewer|ts")
 *                — does NOT cover reviewer_role, justification, prev_hash.
 *   v2 (current): signature = HMAC-SHA256(secret, canonicalJSON(entry without signature/signature_version))
 *                — covers every field including prev_hash.
 *
 * verifyChain() REJECTS v1 entries (MIN_ACCEPTED_VERSION = 2). v1 chains must
 * be re-signed with v2 before they can be verified. New entries always use v2.
 *
 * All signature/prev_hash equality checks use crypto.timingSafeEqual to prevent
 * timing-side-channel attacks against attestation chains.
 *
 * Chain integrity means:
 *   - Entries cannot be removed without detection (prev_hash breaks).
 *   - Individual entries cannot be altered without detection (signature breaks).
 *   - Replay is detectable via timestamp ordering.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SIGNATURE_VERSION = 2;

/**
 * Minimum accepted signature version for chain verification.
 * v1 signatures only covered tc_id|status|reviewer|ts, leaving reviewer_role,
 * justification, and prev_hash unsigned — a material integrity gap.
 * Chains containing v1 entries are rejected rather than silently downgraded.
 */
const MIN_ACCEPTED_VERSION = 2;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Append a signed, hash-chained entry to a JSONL log file.
 *
 * @param {string} jsonlPath  - absolute or relative path to the .jsonl file
 * @param {object} entry      - { tc_id, status, reviewer, reviewer_role, justification? }
 * @param {string} secret     - HMAC secret (typically process.env.UAT_SECRET)
 * @returns {object}          - the full entry that was written (with ts, prev_hash, signature, signature_version)
 */
export function appendEntry(jsonlPath, entry, secret) {
  if (!secret) throw new UatLogError('UAT_SECRET is required for signing log entries', 2);
  if (!entry.tc_id) throw new UatLogError('entry.tc_id is required', 2);
  if (!entry.status) throw new UatLogError('entry.status is required', 2);
  if (!entry.reviewer) throw new UatLogError('entry.reviewer is required', 2);
  if (!entry.reviewer_role) throw new UatLogError('entry.reviewer_role is required', 2);

  fs.mkdirSync(path.dirname(path.resolve(jsonlPath)), { recursive: true });

  const ts = new Date().toISOString();
  const prevHash = _computePrevHash(jsonlPath, secret);

  const fullEntry = {
    tc_id: entry.tc_id,
    status: entry.status,
    reviewer: entry.reviewer,
    reviewer_role: entry.reviewer_role,
    justification: entry.justification ?? '',
    ts,
    prev_hash: prevHash,
    signature_version: SIGNATURE_VERSION,
  };
  fullEntry.signature = hmac(secret, _canonicalJSON(fullEntry));

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
  let prevRawJson = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      errors.push(`Line ${i + 1}: JSON parse error`);
      return { valid: false, brokenAt: i + 1, errors };
    }

    const expectedPrevHash = prevRawJson === null
      ? _emptyHash(secret, jsonlPath)
      : hmac(secret, prevRawJson);

    if (!_safeEqual(entry.prev_hash, expectedPrevHash)) {
      errors.push(
        `Line ${i + 1} (${entry.tc_id}): prev_hash mismatch — chain broken. ` +
        `Expected ${expectedPrevHash.slice(0, 8)}… got ${String(entry.prev_hash).slice(0, 8)}…`
      );
      return { valid: false, brokenAt: i + 1, errors };
    }

    // Reject v1 entries — they only sign tc_id|status|reviewer|ts, leaving
    // reviewer_role, justification, and prev_hash unsigned.
    const entryVersion = entry.signature_version ?? 1;
    if (entryVersion < MIN_ACCEPTED_VERSION) {
      errors.push(
        `Line ${i + 1} (${entry.tc_id}): signature_version ${entryVersion} is below ` +
        `minimum accepted version ${MIN_ACCEPTED_VERSION}. ` +
        'v1 signatures do not cover reviewer_role, justification, or prev_hash. ' +
        'Re-sign this chain with v2 to restore chain integrity.'
      );
      return { valid: false, brokenAt: i + 1, errors };
    }

    const expectedSig = _expectedSignature(entry, secret);
    if (!_safeEqual(entry.signature, expectedSig)) {
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
 * Constant-time hex-string comparison.
 * Returns false for any length mismatch or non-string input without leaking timing.
 */
function _safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Canonical JSON serialization for signing.
 * Keys sorted alphabetically; signature field excluded (signature_version
 * IS included so it is part of the signed payload).
 *
 * Exported for use in tests and external tooling.
 */
export function _canonicalJSON(entry) {
  const { signature: _s, ...rest } = entry; // eslint-disable-line no-unused-vars
  const sortedKeys = Object.keys(rest).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = rest[k];
  return JSON.stringify(sorted);
}

/**
 * Compute the expected signature for a stored entry.
 * Only v2+ signatures are accepted.
 * v2 (current): HMAC over canonical JSON of the full entry (all fields
 * except signature itself, keys sorted alphabetically).
 *
 * @throws {UatLogError} if entry.signature_version < MIN_ACCEPTED_VERSION
 */
function _expectedSignature(entry, secret) {
  const version = entry.signature_version ?? 1;
  if (version < MIN_ACCEPTED_VERSION) {
    throw new UatLogError(
      `v1 signatures are no longer accepted; please re-sign with v2. ` +
      `(entry tc_id=${entry.tc_id}, signature_version=${version})`,
      1,
    );
  }
  return hmac(secret, _canonicalJSON(entry));
}

/**
 * The prev_hash for the very first entry in a log is domain-separated by the
 * basename of the JSONL file so that two projects sharing the same UAT_SECRET
 * produce distinct genesis sentinels and cannot replay each other's chains.
 *
 * Input format: "chain-init:<basename>" (e.g. "chain-init:uat-log.jsonl")
 *
 * BREAKING CHANGE (SEC-F7): old sentinel = hmac(secret, '').
 * Existing chains written before this version will fail verifyChain() at the
 * first entry. Re-create or re-sign existing chains to adopt the new sentinel.
 *
 * @param {string} secret
 * @param {string} jsonlPath  — absolute or relative path to the .jsonl file
 */
function _emptyHash(secret, jsonlPath) {
  return hmac(secret, 'chain-init:' + path.basename(jsonlPath));
}

/**
 * Compute the prev_hash that the NEXT entry should record.
 * If the file doesn't exist or is empty, returns the domain-separated sentinel.
 */
function _computePrevHash(jsonlPath, secret) {
  const lines = readLines(jsonlPath);
  if (lines.length === 0) return _emptyHash(secret, jsonlPath);
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
