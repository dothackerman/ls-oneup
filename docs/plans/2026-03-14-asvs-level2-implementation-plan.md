# ASVS Level 2 Implementation Plan (2026-03-14)

## Purpose

Bring `ls-oneup` to an honest ASVS Level 2 posture first.

This plan is agent-first:

1. it groups the remaining Level 2 work into parallelizable lanes,
2. it keeps human-facing documentation separate from maintenance artifacts,
3. it defines ownership boundaries to reduce merge friction,
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
   - or an explicitly accepted deferred exception approved by the operator.

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

Use four implementation lanes plus one integration lane:

1. Lane A: Browser, transport, and configuration hardening.
2. Lane B: Input, API, and file-handling hardening.
3. Lane C: Data protection, logging, and error-handling hardening.
4. Lane D: Authorization and business-logic hardening.
5. Lane E: Integration, evidence refresh, and final Level 2 gate review.

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

Deliverables:

1. A maintained Level 2 workboard document or JSON artifact.
2. Lane assignment for each open Level 2 control.

## Lane A: Browser, Transport, And Configuration

Owns:

1. `worker/index.ts` for response headers and request policy changes.
2. `wrangler.jsonc`
3. `docs/requirements/08-local-testing-and-first-release-runbook.md`
4. `docs/requirements/12-m1-security-decision-record.md` when header/transport/config decisions change
5. transport/config-related tests

Primary chapters:

1. `V3`
2. `V12`
3. `V13`

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

1. Some `V12` items depend on Cloudflare deployment configuration and may require documentation plus operator deployment actions, not just code.

Failure mode:

1. Adding headers blindly can break the UI or produce fake compliance without deployment evidence.

## Lane B: Input, API, And File Handling

Owns:

1. `src/shared/validation.ts`
2. `worker/index.ts` request validation and method handling
3. `worker/repository.ts` only when API hardening requires repository-side constraints
4. upload-related tests in `tests/integration/*` and `tests/e2e/*`
5. file-handling docs and acceptance notes

Primary chapters:

1. `V1`
2. `V4`
3. `V5`

Likely implementation slices:

1. Strengthen input normalization and validation boundaries.
2. Restrict allowed HTTP methods and document unsupported method behavior.
3. Harden upload handling beyond MIME and size:
   - pixel flood limits,
   - archive/path-handling prohibitions if future compressed uploads appear,
   - safer media validation assumptions.
4. Review request/response generation behavior for header and framing safety.

Main constraint:

1. Several V1/V4 items may require evidence and documented parsing policy, not only code tweaks.

Failure mode:

1. Superficial validator additions may lower checklist counts without meaningfully reducing abuse risk.

## Lane C: Data Protection, Logging, And Error Handling

Owns:

1. `worker/index.ts` error behavior and log events
2. `worker/submission-security.ts`
3. `docs/security/*`
4. `docs/requirements/12-m1-security-decision-record.md`
5. security unit/integration tests

Primary chapters:

1. `V14`
2. `V16`
3. selected `V15` controls related to defensive coding and secure failures

Likely implementation slices:

1. Define and enforce retention/minimization rules for stored submission data and uploaded images.
2. Improve audit/security event logging:
   - what is logged,
   - what is explicitly excluded,
   - how failure classes are represented,
   - what operator review is expected.
3. Standardize error-handling behavior and evidence it with tests.
4. Add defensive coding and failure-mode documentation where controls are presently under-evidenced.

Main constraint:

1. Logging controls are easy to over-claim; the repo needs both behavior and documentation.

Failure mode:

1. Producing more logs but still leaking sensitive context or lacking operator guidance.

## Lane D: Authorization And Business Logic

Owns:

1. `worker/index.ts` authorization logic
2. domain rules in `src/shared/*`
3. authorization/business-flow tests
4. supporting requirement docs for security and API behavior

Primary chapters:

1. `V2`
2. `V8`
3. selected `V15` controls tied to architecture and trust boundaries

Likely implementation slices:

1. Make authorization model explicit:
   - admin vs farmer permissions,
   - object-level boundaries,
   - trust in Cloudflare Access headers,
   - expectations for internal vs end-user actions.
2. Add abuse-resistance controls for sensitive workflows.
3. Define and enforce business-logic constraints where Level 2 requires them.

Main constraint:

1. This lane likely needs operator decisions, not just implementation work.

Failure mode:

1. Writing generic docs about “authorization” without clarifying the actual trust model for this product.

## Lane E: Integration And Evidence

Owns:

1. `docs/security/asvs/*`
2. final evidence refreshes in requirement/security docs when behavior changes land
3. cross-lane integration fixes
4. final validation pass

Tasks:

1. Merge completed lane work.
2. Refresh the Level 2 interpretation in the human checklist.
3. Re-audit Level 2 controls with evidence-based reasoning.
4. Reject unsupported `completed` claims.

Required final checks:

1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:unit`
5. `npm run test:integration`
6. `npm run test:e2e`
7. `npm run crypto:run`
8. `npm run asvs:gate`

## Parallelization Rules

1. Agents are not alone in the codebase; no reverting others' changes.
2. Shared-file hotspots must be explicitly owned or sequenced.
3. `worker/index.ts` is the biggest merge-risk file:
   - Lane A owns response-header and transport sections.
   - Lane B owns request validation and method behavior.
   - Lane C owns error/logging behavior.
   - Lane D owns authorization/business-logic sections.
4. If two lanes need the same function or block, extract first, then divide ownership.
5. Evidence artifacts in `docs/security/asvs/` belong to Lane E only.

## Suggested Multi-Agent Execution Order

### Wave 1

Run in parallel:

1. Lane A kickoff
2. Lane B kickoff
3. Lane C kickoff

Reason:

1. These lanes have the most implementation surface and the least product-decision dependency.

### Wave 2

Start after Wave 1 has clarified trust boundaries:

1. Lane D authorization/business-logic

Reason:

1. Lane D is smaller in raw count but more dependent on explicit operator decisions.

### Wave 3

After lanes stabilize:

1. Lane E integration and evidence refresh

## Commit Cadence

1. One logical Level 2 slice per commit.
2. Push after each green slice.
3. Do not combine implementation and final ASVS evidence refresh unless the slice is tiny and self-contained.

## Success Criteria

Minimum success:

1. The repo has a tracked work program for all open Level 2 controls.
2. The human checklist clearly reports Level 2 and Level 3 current state.
3. Parallel implementation can proceed without constant merge collisions.

Target success:

1. Level 2 TODO count trends down chapter by chapter.
2. Each closed Level 2 control is supported by code, tests, or explicit documentation evidence.
3. Deferred Level 3 items remain explicitly marked as such rather than silently ignored.

## Immediate Next Action

Start with Wave 1 and create the Level 2 execution dataset:

1. enumerate the `101` open Level 2 controls,
2. map each to Lane A/B/C/D,
3. identify which controls are `docs-only`, `code-only`, or `mixed`,
4. cut the first three parallel implementation slices from that map.
