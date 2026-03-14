# ASVS Level 2 Implementation Plan (2026-03-14)

## Purpose

Bring `ls-oneup` to an honest ASVS Level 2 posture first.

This plan is agent-first:

1. it groups the remaining Level 2 work into parallelizable module-based workstreams,
2. it keeps human-facing documentation separate from maintenance artifacts,
3. it defines file ownership boundaries to reduce merge friction,
4. it preserves room for selective Level 3 carryovers only where they are cheap or already partly implemented.

## Current State

Level summary from `docs/security/asvs/checklist.machine.json`:

| Level | Completed | TODO | Not applicable | Total |
| ----- | --------- | ---- | -------------- | ----- |
| L1    | 3         | 39   | 28             | 70    |
| L2    | 8         | 101  | 74             | 183   |
| L3    | 7         | 58   | 27             | 92    |

Interpretation:

1. The project is not close to broad Level 2 coverage yet.
2. Cryptography is the strongest area, but it is not representative of the whole system.
3. The highest-value goal is to reduce the `101` open L2 controls chapter by chapter.

## Level 2 Target Rule

Formal target:

1. Every Level 2 control should end in one of:
   - `completed`,
   - `not_applicable` with specific reasoning,
   - or `deferred_exception` with explicit operator approval and specific reasoning.

Selective Level 3 carryover rule:

1. Pull in an L3 control only when at least one is true:
   - it is cheap on the current Cloudflare stack,
   - it materially reduces a real product risk,
   - it is needed to make an L2 control credible,
   - it is already mostly implemented and needs only evidence or light hardening.

Current obvious L3 deferral:

1. `V11.7.1` full memory encryption / confidential computing remains platform-dependent and should stay outside the core implementation target unless deployment architecture changes.

## Level 2 Backlog By Chapter

Open Level 2 controls:

| Chapter                                 | Level 2 TODO |
| --------------------------------------- | ------------ |
| V1 Encoding and Sanitization            | 18           |
| V2 Validation and Business Logic        | 7            |
| V3 Web Frontend Security                | 11           |
| V4 API and Web Service                  | 6            |
| V5 File Handling                        | 5            |
| V8 Authorization                        | 3            |
| V12 Secure Communication                | 6            |
| V13 Configuration                       | 12           |
| V14 Data Protection                     | 7            |
| V15 Secure Coding and Architecture      | 10           |
| V16 Security Logging and Error Handling | 16           |

## Delivery Strategy

The project should not attack these controls one by one in checklist order.
That would maximize context switching and minimize real progress.

The project should also not use ASVS chapters as implementation ownership.
ASVS is the validation lens, not the repo topology.

Use module-based workstreams:

1. Workstream A: edge request and response surface.
2. Workstream B: domain validation, authorization, and business rules.
3. Workstream C: storage, cryptography, and submission protection.
4. Workstream D: frontend/admin UI security surface.
5. Workstream E: tests and requirement docs.
6. Workstream F: ASVS artifact refresh and final gate review.

## Phase 0: Baseline And Triage

Goal:

1. Convert the open Level 2 checklist into an execution dataset before feature work starts.

Outputs:

1. Tag each Level 2 TODO as one of:
   - `code`,
   - `docs`,
   - `infra`,
   - `mixed`,
   - `candidate_not_applicable`.
2. Mark dependencies between controls.
3. Identify controls that are really duplicates under one implementation slice.
4. Assign each control to a module-based workstream and a concrete slice owner.

Deliverables:

1. A maintained Level 2 workboard JSON artifact.
2. Workstream assignment for each open Level 2 control.
3. File-ownership boundaries for each workstream.
4. First-wave slice definitions with exact files, tests, and docs to touch.

Canonical artifact:

1. `docs/security/asvs/campaigns/2026-03-level2.json`

## Workstream A: Edge Request And Response Surface

Owns:

1. `worker/index.ts`
2. `worker/security.ts`
3. `wrangler.jsonc`
4. request/response integration tests
5. transport/config deployment notes in `docs/requirements/08-local-testing-and-first-release-runbook.md`

Likely implementation slices:

1. Add and verify a coherent browser security header policy:
   - CSP
   - frame/embed policy
   - MIME sniffing policy
   - COOP / CORP where applicable
   - HSTS documentation and deployment expectations
2. Document expected browser security features and unsupported-browser behavior.
3. Tighten configuration/secrets/rotation/timeout expectations in repo docs.
4. Define environment-specific hardening expectations for local vs deployed runtime.

Main constraint:

1. Some transport controls depend on Cloudflare deployment configuration and may require documentation plus operator deployment actions, not just code.

Failure mode:

1. Adding headers blindly can break the UI or produce fake compliance without deployment evidence.

## Workstream B: Domain Validation, Authorization, And Business Rules

Owns:

1. `src/shared/validation.ts`
2. `src/shared/domain.ts`
3. request parsing, authorization, and business-rule branches in `worker/index.ts`
4. rule-focused tests in `tests/integration/*` and `tests/e2e/*`
5. API behavior notes in `docs/requirements/09-m1-api-contract.md`

Likely implementation slices:

1. Strengthen input normalization and validation boundaries.
2. Restrict allowed HTTP methods and document unsupported method behavior.
3. Define anti-automation and workflow guardrails where the product can honestly support them.
4. Harden upload handling beyond MIME and size:
   - pixel flood limits,
   - archive/path-handling prohibitions if future compressed uploads appear,
   - safer media validation assumptions.
5. Review request/response generation behavior for header and framing safety where it is implemented in application code.
6. Make the server-side authorization model explicit and keep object-level access decisions out of frontend-owned work.

Main constraint:

1. Several controls here need explicit rule documentation, not just validator code.

Failure mode:

1. Superficial validator additions may lower checklist counts without meaningfully reducing abuse risk.

## Workstream C: Storage, Cryptography, And Submission Protection

Owns:

1. `worker/repository.ts`
2. `worker/submission-security.ts`
3. crypto/storage behavior in `worker/index.ts`
4. `docs/security/crypto*`
5. storage/security unit and integration tests

Likely implementation slices:

1. Define and enforce retention/minimization rules for stored submission data and uploaded images.
2. Keep submission confidentiality and crypto handling aligned with the decision record.
3. Add storage-side safeguards and evidence them with tests.
4. Hand off logging and generic error semantics to Workstream E unless they are inseparable from storage behavior.

Main constraint:

1. Storage and crypto changes can look complete before admin read paths and failure handling are fully evidenced.

Failure mode:

1. Closing data-protection controls in the database layer while leaving adjacent read paths and cleanup behavior under-specified.

## Workstream D: Frontend And Admin UI Security Surface

Owns:

1. `src/App.tsx`
2. `src/features/**`
3. `src/styles.css`
4. browser-facing e2e tests
5. browser behavior notes when user-facing security expectations change

Likely implementation slices:

1. Remove insecure client assumptions and tighten browser-visible security behavior.
2. Keep asset loading, redirects, and client-side storage behavior aligned with the intended header policy.
3. Add UX evidence only when the control actually has a user-visible behavior.

Main constraint:

1. This workstream should not own server authorization or storage decisions even when ASVS puts them near browser controls.

Failure mode:

1. Treating browser-facing mitigations as if they can compensate for missing server-side controls.

## Workstream E: Tests And Requirement Docs

Owns:

1. `tests/security.unit.test.ts`
2. `tests/integration/*`
3. `tests/e2e/*`
4. `docs/requirements/08-local-testing-and-first-release-runbook.md`
5. `docs/requirements/09-m1-api-contract.md`
6. `docs/requirements/12-m1-security-decision-record.md`

Tasks:

1. Add or refine evidence for behavior changes made by Workstreams A-D.
2. Keep requirement docs and ADRs aligned with implemented behavior.
3. Own generic logging/error-handling verification and operator-facing guidance.
4. Prepare clean evidence for the auditor refresh.

## Workstream F: ASVS Artifact Refresh And Final Gate Review

Owns:

1. `docs/security/asvs/*`
2. final integration-only checklist updates
3. `npm run asvs:gate`

Tasks:

1. Re-audit Level 2 controls with evidence-based reasoning after implementation slices land.
2. Refresh the human checklist interpretation.
3. Reject unsupported `completed` claims.
4. Keep ASVS artifacts owned by the audit flow, not by implementation workers.

Required final checks:

1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:unit`
5. `npm run test:integration`
6. `npm run test:e2e`
7. `npm run crypto:run`
8. `npm run asvs:gate`

## File Ownership Rules

1. Agents are not alone in the codebase; no reverting others' changes.
2. Shared-file hotspots must be explicitly owned or sequenced in the workboard before coding starts.
3. `worker/index.ts` is a hotspot and should be split by route or helper extraction before concurrent editing.
4. `docs/security/asvs/*` belongs to Workstream F only.
5. Requirement docs belong to Workstream E unless a slice is docs-only.
6. If two workstreams need the same function or block, extract a new module first and then reassign ownership to the new file.

## Suggested Multi-Agent Execution Order

### Wave 1

Run in parallel:

1. Workstream A kickoff
2. Workstream B kickoff
3. Workstream C kickoff
4. Workstream E kickoff for test/doc scaffolding only

Reason:

1. These workstreams have the most implementation surface and the least product-decision dependency.

### Wave 2

Start after Wave 1 has clarified trust boundaries:

1. Workstream D frontend/admin UI security surface

Reason:

1. Browser-facing work depends on the server/header/security posture becoming concrete first.

### Wave 3

After lanes stabilize:

1. Workstream F audit refresh and final gate review

## Commit Cadence

1. One logical Level 2 slice per commit.
2. Push after each green slice.
3. Do not combine implementation and final ASVS evidence refresh unless the slice is tiny and self-contained.

## Success Criteria

Minimum success:

1. The repo has a tracked work program for all open Level 2 controls.
2. The human checklist clearly reports Level 2 and Level 3 current state.
3. Parallel implementation can proceed without constant merge collisions.
4. ASVS artifacts remain an audit output, not an implementation scratchpad.

Target success:

1. Level 2 TODO count trends down chapter by chapter.
2. Each closed Level 2 control is supported by code, tests, or explicit documentation evidence.
3. Deferred Level 3 items remain explicitly marked as such rather than silently ignored.

## Immediate Next Action

Start with Wave 1 and create the Level 2 execution dataset:

1. enumerate the `101` open Level 2 controls,
2. map each to Workstream A/B/C/D/E,
3. identify which controls are `docs-only`, `code-only`, `mixed`, or `deferred_exception` candidates,
4. cut the first three parallel implementation slices from that map,
5. keep Workstream F idle until implementation evidence exists to audit.
