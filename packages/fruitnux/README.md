# @leapnux/fruitnux

External-deliverables layer of the 6-NUX taxonomy. Produces audit packets: SCAs, OSCAL evidence, HMAC sign-off ledgers, RTM, and BR-attestations.

**Status: v0.5.0-alpha.1 — active.** Promoted from skeleton in v0.6 (AP-F7). Verbs transferred from `@leapnux/branchnux` to align with the 6-NUX taxonomy.

fruitnux is the **harvest node**: it produces the artifacts that leave the engineering team and go to auditors, regulators, and compliance reviewers. SCA documents, NIST OSCAL 1.1.2 JSON, HMAC-chained tamper-evident sign-off ledgers, the Requirements Traceability Matrix, and Business Requirement attestations.

## Install

```sh
npm install -g @leapnux/fruitnux
```

Or install the full 5-NUX family:

```sh
npm install -g @leapnux/5nux
```

## Verbs

| Verb | What it does |
|---|---|
| `fruitnux rtm` | Regenerate `requirements/TRACEABILITY.md` by cross-referencing R-IDs across REQUIREMENTS.md, sprint logs, code annotations, and test files. |
| `fruitnux sca init <surface>` | Scaffold `requirements/validations/<surface>/v1.0_<DATE>.md` from the canonical 8-section SCA template. |
| `fruitnux sca generate <surface>` | Fill per-control evidence rows from current test results + R-ID mappings. `[VERIFY]` marks cells needing human review. |
| `fruitnux sca pdf <surface>` | Render the latest SCA to PDF via puppeteer-core (optional dep). |
| `fruitnux sca oscal <surface>` | Emit NIST OSCAL 1.1.2 assessment-results JSON. Compatible with IBM Compliance Trestle. |
| `fruitnux sign <surface>` | Record an HMAC-chained UAT attestation; appends to `uat-log.jsonl`. |
| `fruitnux sign pdf <surface>` | Render the UAT sign-off ledger to an A4 PDF. Verifies HMAC-SHA256 chain; banner if broken. |
| `fruitnux sign stale-check <surface>` | Report UAT sign-off entries older than --threshold (default: 90d). |
| `fruitnux br init <id>` | Scaffold a BR-XX entry in `requirements/BUSINESS_REQUIREMENTS.md`. |
| `fruitnux br link <br-id> <r-ids>` | Add a BR-XX → R-ID mapping. r-ids is a comma-separated list. |
| `fruitnux br rtm` | Render `requirements/UAT_TRACEABILITY.md` — a BR-XX → R-XX → TC-XX mapping table. |

Run `<verb> --help` for the full flag surface, or see [docs/reference.md](https://github.com/leapnux/5nux/blob/main/docs/reference.md).

## Migration from branchnux

These verbs were in `branchnux` through v0.5. They moved to fruitnux in v0.6 (AP-F7) to align with the 6-NUX taxonomy. branchnux v0.6 retains deprecation shims that print a warning and forward — the shims are removed in v0.7.

```sh
# Old (branchnux, v0.5):
branchnux rtm
branchnux sca generate login
branchnux sign login
branchnux br init BR-01

# New (fruitnux, v0.6+):
fruitnux rtm
fruitnux sca generate login
fruitnux sign login
fruitnux br init BR-01
```

## Industry standards profiles

`sca init` and `sca generate` support four built-in industry profiles:

| Profile | Standards |
|---|---|
| `general` | OWASP ASVS, OWASP Top 10, WCAG 2.2, NIST CSF |
| `fintech` | SOC 2 Type II, NIST SP 800-53, PCI DSS, ISO 27001, FFIEC |
| `healthcare` | HIPAA, HITECH, NIST SP 800-66, HL7 FHIR security |
| `malaysia-banking` | BNM RMiT, PDPA, CSA CCM (25+ controls) |

Pass `--industry <name>` to `sca init` to scaffold with the correct standards mapping.

## What fruitnux does NOT include

Multi-party sign-off workflows with live state, immutable hosted evidence stores, and regulator-facing portals belong in the LeapNuX 6-NUX premium tier. fruitnux covers file-native, local-only, single-user deliverable generation.

## Where this fits in 6-NUX

```
root → trunk → branch → leaf → FRUIT (fruitnux) → soil
```

fruitnux is the external deliverables layer — what outsiders consume: auditors, regulators, customers, investors. Upstream: `branchnux` produces evidence artifacts (test results, execution logs); fruitnux assembles them into audit-ready deliverables.

See [docs/6-NUX.md](https://github.com/leapnux/5nux/blob/main/docs/6-NUX.md) for the artifact taxonomy and [docs/MOTTO.md](https://github.com/leapnux/5nux/blob/main/docs/MOTTO.md) for the OSS/Premium product split.

## License

Apache-2.0 (c) 2026 Chu Ling

## Sibling packages

[rootnux](https://www.npmjs.com/package/@leapnux/rootnux), [trunknux](https://www.npmjs.com/package/@leapnux/trunknux), [branchnux](https://www.npmjs.com/package/@leapnux/branchnux), [leafnux](https://www.npmjs.com/package/@leapnux/leafnux), [fruitnux](https://www.npmjs.com/package/@leapnux/fruitnux), [6nux-core](https://www.npmjs.com/package/@leapnux/6nux-core), [5nux meta](https://www.npmjs.com/package/@leapnux/5nux). See the [root README](https://github.com/leapnux/5nux#readme) for the full taxonomy and install instructions.
