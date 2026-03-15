# ASVS Checklist (Human View)

This report is optimized for human review.
Structured per-control data remains in `checklist.machine.json` and `checklist.findings.jsonl`.

## Snapshot

- Generated at: 2026-03-15T09:55:46.197Z
- Source commit: ae4ab5b261a72b63edd6a10b4e2d600ea6937e2b
- Source blob: f7ae2926598c4648ff7614a6968e4c8fd89524bd
- Total requirements: 345
- Completed: 18
- TODO: 198
- Not applicable: 129
- Accepted deferred exceptions: 0

## Level Target View

| Level | Completed | TODO | Not applicable | Deferred exception | Total |
|---|---|---|---|---|---|
| L1 | 3 | 39 | 28 | 0 | 70 |
| L2 | 8 | 101 | 74 | 0 | 183 |
| L3 | 7 | 58 | 27 | 0 | 92 |

- Current practical target: Level 2 first, with selective Level 3 carryovers where they are cheap, highly relevant, or already partially implemented.
- Level 2 current state: 8 completed, 101 todo, 74 not applicable, 0 deferred exception.
- Level 3 current state: 7 completed, 58 todo, 27 not applicable, 0 deferred exception.

## Read This Before Interpreting The TODO Count

- The checklist covers all 345 ASVS controls, not just the crypto work completed recently.
- A large TODO count means most ASVS chapters are still open or only lightly evidenced, not that recent security work failed.
- Deferred exceptions are explicit operator-approved risk accepts, not soft completions.
- The strongest current chapter is `V11 Cryptography`; several other chapters are intentionally `not_applicable` because the repo does not implement those technologies or account systems.

## Chapter Summary

| Chapter | Area | Completed | TODO | Not applicable | Deferred exception |
|---|---|---|---|---|---|
| V1 | Encoding and Sanitization | 0 | 29 | 1 | 0 |
| V2 | Validation and Business Logic | 0 | 13 | 0 | 0 |
| V3 | Web Frontend Security | 0 | 31 | 0 | 0 |
| V4 | API and Web Service | 0 | 14 | 2 | 0 |
| V5 | File Handling | 0 | 13 | 0 | 0 |
| V6 | Authentication | 0 | 0 | 47 | 0 |
| V7 | Session Management | 0 | 0 | 19 | 0 |
| V8 | Authorization | 0 | 13 | 0 | 0 |
| V9 | Self-contained Tokens | 0 | 0 | 7 | 0 |
| V10 | OAuth and OIDC | 0 | 0 | 36 | 0 |
| V11 | Cryptography | 18 | 1 | 5 | 0 |
| V12 | Secure Communication | 0 | 12 | 0 | 0 |
| V13 | Configuration | 0 | 21 | 0 | 0 |
| V14 | Data Protection | 0 | 13 | 0 | 0 |
| V15 | Secure Coding and Architecture | 0 | 21 | 0 | 0 |
| V16 | Security Logging and Error Handling | 0 | 17 | 0 | 0 |
| V17 | WebRTC | 0 | 0 | 12 | 0 |

## Current Security Highlight

- V11 Cryptography: 18 completed, 1 todo, 5 not applicable.
- Remaining open crypto control: V11.7.1 — The repository still contains no mechanism to enable full memory encryption or confidential-computing controls for the Worker runtime. Even with encrypted D1 rows and encrypted R2 image objects, tokens, decrypted submission payloads, and decrypted image bytes still enter normal process memory during request handling.

## Human Navigation

- Security overview: `../README.md`
- Security decision record: `../../requirements/12-m1-security-decision-record.md`
- Level 2 implementation plan: `../../plans/2026-03-14-asvs-level2-implementation-plan.md`
- ASVS pipeline and maintenance notes: `README.md`
- Full structured checklist: `checklist.machine.json`
