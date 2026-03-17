# M1 Agent Execution Contract

## Purpose
Define the execution contract so a coding agent with subagents can implement M1 cleanly, consistently, and with a tight quality loop.

## Mandatory Engineering Principles
1. `SOLID`
2. `YAGNI`
3. `KISS`
4. High cohesion, low coupling
5. Clear module boundaries and explicit interfaces

## Scope Boundaries
1. Implement only M1 scope from `02-milestones.md`.
2. Do not implement M2/M3 features preemptively.
3. Do not execute production Cloudflare release actions from agents; production deploy/migrate flows are human-triggered via GitHub Actions.

## Required Subagent Structure (Recommended)
1. `architecture-subagent`
   - keeps boundaries and contracts coherent
2. `backend-subagent`
   - API, D1 schema, R2 integration, concurrency guards
3. `frontend-subagent`
   - farmer/admin UX, `de-CH` copy, validation UX states
4. `test-subagent`
   - integration tests and end-to-end suite
5. `docs-subagent`
   - updates docs per implemented behavior and decisions

## Definition of Done for Any Change
1. Requirement linkage is explicit (which M1 acceptance criterion is covered).
2. Implementation is formatted and lint-clean.
3. Integration tests pass locally.
4. If behavior changed, docs are updated in same change set.
5. Commit message is compact and informative.

## Mandatory Quality Loop
For each feature/fix change:
1. Implement
2. Formatter
3. Linter
4. Integration tests (Workers-runtime semantics)
5. If green: commit and push

Required stop rule:
1. If any step fails, do not commit.
2. Fix and rerun loop from the failed step onward.

## M1 Completion Gate
M1 is complete only when:
1. All M1 acceptance criteria in `02-milestones.md` are implemented.
2. A complete end-to-end test suite covers the M1 business logic:
   - one-time link usage
   - expiry behavior
   - mandatory GPS
   - mandatory single image with backend enforcement
   - first-submit-wins concurrency
   - admin crop override with timestamp
   - admin status derivation (`offen`, `eingereicht`, `abgelaufen`)
3. The full local test run is green.
4. `ci:local` is green and includes Workers-runtime integration + E2E execution.

## UX Quality Expectations
1. Intuitive and visually coherent UX (mobile-first for farmer flow).
2. UI text uses Swiss Standard German (`de-CH`), consistent `Sie` form, Swiss `ss` spellings, and Swiss date/number formats.
3. Error states are explicit and actionable (permission denied, invalid image, expired/used link).
4. Avoid generic template UI; design should feel intentional.

## Commit Message Policy
1. Keep messages compact and informative.
2. Prefer scope-first style.

Examples:
1. `feat(m1-form): enforce backend jpeg/png 2mb limit`
2. `test(m1-submit): cover first-submit-wins race path`
3. `docs(m1): update local testing and runbook`

## Required Supporting Artifacts
1. API contract document for M1 endpoints: `09-m1-api-contract.md`.
2. D1 schema and migration plan with versioning notes: `10-m1-data-model-and-migrations.md`.
3. Test matrix mapping each M1 acceptance criterion to integration/e2e tests: `11-m1-test-traceability-matrix.md`.
4. Security decision record (ADR-style): `12-m1-security-decision-record.md`.
5. Deployment runbook for first manual Cloudflare release (document only until auth exists): `08-local-testing-and-first-release-runbook.md`.
