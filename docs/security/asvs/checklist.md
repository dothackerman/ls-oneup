# ASVS Checklist

This report is optimized for review.
Structured per-control data remains in [checklist.machine.json](./checklist.machine.json) and [checklist.findings.jsonl](./checklist.findings.jsonl).

## Snapshot

- Generated at: 2026-03-21T06:23:56Z
- Source commit: a79c0184f0d5ade9dc4c9f4c0f22362e8136e4af
- Source blob: f7ae2926598c4648ff7614a6968e4c8fd89524bd
- Total requirements: 345
- Completed: 19
- Not reviewed: 195
- Not implemented: 2
- Needs decision: 0
- Not applicable: 129
- Accepted deferred exceptions: 0
- Open controls: 197

## Level Target View

| Level | Completed | Not reviewed | Not implemented | Needs decision | Deferred exception | Not applicable | Total |
| ----- | --------- | ------------ | --------------- | -------------- | ------------------ | -------------- | ----- |
| L1    | 5         | 36           | 1               | 0              | 0                  | 28             | 70    |
| L2    | 7         | 102          | 0               | 0              | 0                  | 74             | 183   |
| L3    | 7         | 57           | 1               | 0              | 0                  | 27             | 92    |

- Current practical target: Level 2 first, with selective Level 3 carryovers where they are cheap, highly relevant, or already partially implemented.
- Level 2 current state: 7 completed, 102 not reviewed, 0 not implemented, 0 needs decision, 0 deferred exception, 74 not applicable.
- Level 3 current state: 7 completed, 57 not reviewed, 1 not implemented, 0 needs decision, 0 deferred exception, 27 not applicable.

## Read This Before Interpreting Open-Control Counts

- The checklist covers all 345 ASVS controls, not just the crypto work completed recently.
- A large open-controls count means most ASVS chapters are still open or only lightly evidenced, not that recent security work failed.
- Deferred exceptions are explicit operator-approved risk accepts, not soft completions.
- The strongest current chapter is still `V11 Cryptography`, but its inventory-maintenance evidence regressed in this audit because the repo’s crypto gate now reports stale inventory references.

## Chapter Summary

| Chapter | Area                                | Completed | Not reviewed | Not implemented | Needs decision | Deferred exception | Not applicable |
| ------- | ----------------------------------- | --------- | ------------ | --------------- | -------------- | ------------------ | -------------- |
| V1      | Encoding and Sanitization           | 0         | 29           | 0               | 0              | 0                  | 1              |
| V2      | Validation and Business Logic       | 0         | 13           | 0               | 0              | 0                  | 0              |
| V3      | Web Frontend Security               | 0         | 31           | 0               | 0              | 0                  | 0              |
| V4      | API and Web Service                 | 0         | 14           | 0               | 0              | 0                  | 2              |
| V5      | File Handling                       | 2         | 9            | 2               | 0              | 0                  | 0              |
| V6      | Authentication                      | 0         | 0            | 0               | 0              | 0                  | 47             |
| V7      | Session Management                  | 0         | 0            | 0               | 0              | 0                  | 19             |
| V8      | Authorization                       | 0         | 13           | 0               | 0              | 0                  | 0              |
| V9      | Self-contained Tokens               | 0         | 0            | 0               | 0              | 0                  | 7              |
| V10     | OAuth and OIDC                      | 0         | 0            | 0               | 0              | 0                  | 36             |
| V11     | Cryptography                        | 17        | 2            | 0               | 0              | 0                  | 5              |
| V12     | Secure Communication                | 0         | 12           | 0               | 0              | 0                  | 0              |
| V13     | Configuration                       | 0         | 21           | 0               | 0              | 0                  | 0              |
| V14     | Data Protection                     | 0         | 13           | 0               | 0              | 0                  | 0              |
| V15     | Secure Coding and Architecture      | 0         | 21           | 0               | 0              | 0                  | 0              |
| V16     | Security Logging and Error Handling | 0         | 17           | 0               | 0              | 0                  | 0              |
| V17     | WebRTC                              | 0         | 0            | 0               | 0              | 0                  | 12             |

## Current Security Highlight

- V11 Cryptography: 18 completed, 1 open, 5 not applicable.
- Crypto inventory maintenance is green again: `npm run crypto:run` now passes because live crypto evidence is tracked separately from provenance and migration filenames are no longer gate-validated current references.
- V5 File Handling now has two completed controls with direct evidence: byte-size limits are enforced before processing, and stored image object keys are generated from trusted internal identifiers rather than user filenames.
- V5.2.2 and V5.2.6 are now explicitly open as implementation gaps rather than vague `not_reviewed` placeholders: filename-extension matching is not enforced, and the Worker still does not cap image dimensions or pixel count.

## Navigation

- Security overview: [docs/security/README.md](../README.md)
- Security decision record: [docs/requirements/12-m1-security-decision-record.md](../../requirements/12-m1-security-decision-record.md)
- Level 2 implementation plan: [docs/plans/2026-03-14-asvs-level2-implementation-plan.md](../../plans/2026-03-14-asvs-level2-implementation-plan.md)
- ASVS pipeline and maintenance notes: [docs/security/asvs/README.md](./README.md)
- Full structured checklist: [checklist.machine.json](./checklist.machine.json)
