# ASVS Level 2 Multi-Agent Execution Plan (2026-03-15)

## Purpose

Move `ls-oneup` toward an honest ASVS Level 2 posture using concurrent implementation slices grouped by file ownership, not by ASVS chapter order.

This plan is stricter than the earlier campaign summary:

1. it treats hotspot files as scheduling problems,
2. it names slices that one agent can actually claim,
3. it keeps docs and audit artifacts separate,
4. it makes parallelism explicit instead of aspirational.

Canonical orchestrator input:

1. `docs/security/asvs/campaigns/2026-03-level2-workboard.json`

Use this Markdown document for human overview and the JSON workboard for agent dispatch.

## Current State

Current ASVS snapshot after the latest audit refresh:

| Level | Completed | TODO | Not applicable | Deferred exception | Total |
| ----- | --------- | ---- | -------------- | ------------------ | ----- |
| L1    | 3         | 39   | 28             | 0                  | 70    |
| L2    | 8         | 101  | 74             | 0                  | 183   |
| L3    | 7         | 58   | 27             | 0                  | 92    |

What this means:

1. The repo is not close to broad Level 2 coverage yet.
2. `V11` is comparatively strong, but most perimeter, file-handling, data-lifecycle, and logging controls remain open.
3. The constraint is no longer “what should we do?” but “how do we let several agents do it without fighting over the same files?”

## Non-Negotiable Constraints

1. `docs/security/asvs/**` remains audit-only.
2. `worker/index.ts` is the main hotspot and must be decomposed or explicitly serialized.
3. `docs/requirements/12-m1-security-decision-record.md` is a shared-doc hotspot and should only be owned by a docs/evidence slice.
4. Each implementation slice must own files, not themes.
5. No slice should claim “fix V3” or “handle logging everywhere.” That is how multi-agent work turns into polite chaos.

## Planning Model

The repo should run with four implementation lanes at most, matching `execution-policy.json`.

The lanes are:

1. Edge/runtime lane
2. Validation/business-rule lane
3. Storage/data-protection lane
4. Docs/tests/evidence lane

Frontend/browser behavior stays delayed until the edge lane makes server behavior concrete.

Execution source of truth:

1. This Markdown file explains intent and sequencing.
2. The JSON workboard is the normalized slice registry the orchestrator should read first.
3. If the Markdown and JSON ever diverge, fix the JSON first and then reconcile the Markdown summary.

## Completed Baseline Slice

Already landed:

1. Sensitive-response anti-caching hardening
   - code: `worker/index.ts`
   - tests: `tests/integration/m1.integration.test.ts`
   - docs: `docs/requirements/09-m1-api-contract.md`, `docs/requirements/12-m1-security-decision-record.md`, `docs/security/crypto-policy.md`
   - effect: closes part of the storage-side response caching gap and gives later slices a clearer baseline

This matters because future slices should build on it rather than re-open response behavior arguments.

## File-Ownership Lanes

### Lane A: Edge And Runtime Policy

Primary ownership:

1. `worker/security.ts`
2. `wrangler.jsonc`
3. extracted helper modules under `worker/` for response/header policy

Supporting files:

1. `worker/index.ts`
2. `tests/integration/m1.integration.test.ts`
3. `docs/requirements/08-local-testing-and-first-release-runbook.md`

Main target:

1. edge/browser header policy
2. browser feature expectations
3. transport/runtime configuration evidence

### Lane B: Validation, Methods, Upload Rules, Authorization

Primary ownership:

1. `src/shared/validation.ts`
2. `src/shared/domain.ts`
3. extracted helper modules under `worker/` for method guards or request parsing

Supporting files:

1. `worker/index.ts`
2. `tests/integration/m1.integration.test.ts`
3. `tests/e2e/m1.spec.ts`
4. `docs/requirements/09-m1-api-contract.md`

Main target:

1. method allowlisting
2. upload hardening
3. anti-automation decisions
4. explicit authorization model

### Lane C: Storage, Retention, Sensitive Data Handling

Primary ownership:

1. `worker/repository.ts`
2. `worker/submission-security.ts`
3. new retention or image-sanitization helpers under `worker/`

Supporting files:

1. `worker/index.ts`
2. `tests/security.unit.test.ts`
3. `tests/integration/m1.integration.test.ts`
4. `docs/security/crypto-policy.md`

Main target:

1. retention and deletion rules
2. image metadata handling
3. storage-side safeguards
4. storage-adjacent failure behavior

### Lane D: Docs, Logging Evidence, Dependency Posture

Primary ownership:

1. `docs/requirements/08-local-testing-and-first-release-runbook.md`
2. `docs/requirements/09-m1-api-contract.md`
3. `docs/requirements/12-m1-security-decision-record.md`
4. new dependency/risky-component/security-ops docs under `docs/security/`

Supporting files:

1. `tests/security.unit.test.ts`
2. `tests/integration/m1.integration.test.ts`
3. `tests/e2e/m1.spec.ts`

Main target:

1. logging/error-handling evidence
2. risky component and dangerous functionality documentation
3. runbook clarity for transport, secrets, and operational verification

## Wave Structure

### Wave 0: Extraction First

Goal:

1. Reduce `worker/index.ts` contention before parallel implementation starts.

Run sequentially:

1. Slice `X1-edge-response-helpers`
2. Slice `X2-submit-request-guards`

These are not glamorous. They are merge-conflict prevention wearing work boots.

#### Slice X1: Edge Response Helpers

- `slice_id`: `X1-edge-response-helpers`
- goal: move reusable response header/cache policy logic out of `worker/index.ts`
- owned_files:
  - `worker/security.ts`
  - new `worker/http-response-policy.ts`
- supporting_files:
  - `worker/index.ts`
  - `tests/integration/m1.integration.test.ts`
- forbidden_files:
  - `docs/security/asvs/**`
- tests_required:
  - `npm run test:integration`
- docs_required:
  - none
- done_when:
  - response-security helpers exist outside `worker/index.ts`
  - route handlers call helpers instead of hand-rolling header logic

#### Slice X2: Submit Request Guards

- `slice_id`: `X2-submit-request-guards`
- goal: extract method, upload, and form validation guards from `worker/index.ts`
- owned_files:
  - new `worker/request-guards.ts`
  - `src/shared/validation.ts`
  - `src/shared/domain.ts`
- supporting_files:
  - `worker/index.ts`
  - `tests/integration/m1.integration.test.ts`
- forbidden_files:
  - `docs/security/asvs/**`
  - `worker/submission-security.ts`
- tests_required:
  - `npm run test:integration`
- docs_required:
  - none
- done_when:
  - submit-route guards live outside the main router
  - later validation and upload slices can edit those helpers without reopening the whole worker file

### Wave 1: Parallel Core Hardening

After Wave 0, run up to four agents in parallel.

#### Slice A2: Header And Transport Policy

- `slice_id`: `A2-header-and-transport-policy`
- goal: implement a coherent response-header policy and document deployment-only controls honestly
- owned_files:
  - `worker/security.ts`
  - `worker/http-response-policy.ts`
  - `wrangler.jsonc`
- supporting_files:
  - `worker/index.ts`
  - `tests/integration/m1.integration.test.ts`
  - `docs/requirements/08-local-testing-and-first-release-runbook.md`
- forbidden_files:
  - `docs/security/asvs/**`
- depends_on:
  - `X1-edge-response-helpers`
- tests_required:
  - `npm run test:integration`
- docs_required:
  - `docs/requirements/08-local-testing-and-first-release-runbook.md`
- controls_intent:
  - browser/security headers
  - transport feature expectations
  - deployment/runtime policy evidence

#### Slice B2: Method And Upload Policy

- `slice_id`: `B2-method-and-upload-policy`
- goal: add explicit method policy and deepen upload hardening beyond MIME and byte size
- owned_files:
  - `src/shared/validation.ts`
  - `src/shared/domain.ts`
  - `worker/request-guards.ts`
- supporting_files:
  - `worker/index.ts`
  - `tests/integration/m1.integration.test.ts`
  - `tests/e2e/m1.spec.ts`
  - `docs/requirements/09-m1-api-contract.md`
- forbidden_files:
  - `docs/security/asvs/**`
  - `worker/submission-security.ts`
- depends_on:
  - `X2-submit-request-guards`
- tests_required:
  - `npm run test:integration`
  - `npm run test:e2e`
- docs_required:
  - `docs/requirements/09-m1-api-contract.md`
- controls_intent:
  - explicit unsupported-method behavior
  - pixel-flood and image-shape checks
  - documented upload assumptions and anti-automation limits

#### Slice C2: Retention And Image Metadata

- `slice_id`: `C2-retention-and-image-metadata`
- goal: define and enforce retention/minimization plus image-metadata handling at the storage layer
- owned_files:
  - `worker/repository.ts`
  - `worker/submission-security.ts`
  - new `worker/data-retention.ts`
- supporting_files:
  - `worker/index.ts`
  - `tests/security.unit.test.ts`
  - `tests/integration/m1.integration.test.ts`
  - `docs/security/crypto-policy.md`
- forbidden_files:
  - `docs/security/asvs/**`
  - `src/features/**`
- depends_on:
  - none
- tests_required:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run crypto:run`
- docs_required:
  - `docs/security/crypto-policy.md`
- controls_intent:
  - retention lifecycle
  - metadata scrubbing or explicit policy
  - storage-side evidence for sensitive data minimization

#### Slice D2: Logging, Dependency Posture, And Shared Docs

- `slice_id`: `D2-logging-and-dependency-posture`
- goal: centralize the repo’s logging/error-handling evidence and dangerous-component documentation
- owned_files:
  - `docs/requirements/08-local-testing-and-first-release-runbook.md`
  - `docs/requirements/09-m1-api-contract.md`
  - `docs/requirements/12-m1-security-decision-record.md`
  - new `docs/security/dependency-risk-register.md`
  - new `docs/security/logging-and-error-handling.md`
- supporting_files:
  - `tests/security.unit.test.ts`
  - `tests/integration/m1.integration.test.ts`
- forbidden_files:
  - `docs/security/asvs/**`
- depends_on:
  - none
- tests_required:
  - `npm run lint`
  - `npm run typecheck`
- docs_required:
  - all owned docs
- controls_intent:
  - V13/V15/V16 evidence scaffolding
  - one authoritative place for riskier components and operational logging expectations

### Wave 2: Frontend Alignment

Frontend should start only after Wave 1 makes the edge and API rules concrete.

#### Slice F1: Frontend Security Alignment

- `slice_id`: `F1-frontend-security-alignment`
- goal: align client storage, asset loading, and browser-visible behavior with the implemented edge policy
- owned_files:
  - `src/App.tsx`
  - `src/features/**`
  - `src/styles.css`
- supporting_files:
  - `tests/e2e/m1.spec.ts`
  - `docs/requirements/09-m1-api-contract.md`
- forbidden_files:
  - `docs/security/asvs/**`
  - `worker/submission-security.ts`
- depends_on:
  - `A2-header-and-transport-policy`
  - `B2-method-and-upload-policy`
- tests_required:
  - `npm run test:e2e`
- docs_required:
  - `docs/requirements/09-m1-api-contract.md` if user-visible behavior changes
- controls_intent:
  - remove insecure client assumptions
  - align any browser-visible restrictions with actual runtime behavior

### Wave 3: Consolidation

Run after all implementation slices are green.

#### Slice G1: Evidence Consolidation

- `slice_id`: `G1-evidence-consolidation`
- goal: ensure tests, ADRs, runbook, and contract docs reflect the implemented state before re-audit
- owned_files:
  - `tests/security.unit.test.ts`
  - `tests/integration/m1.integration.test.ts`
  - `tests/e2e/m1.spec.ts`
  - `docs/requirements/08-local-testing-and-first-release-runbook.md`
  - `docs/requirements/09-m1-api-contract.md`
  - `docs/requirements/12-m1-security-decision-record.md`
- supporting_files:
  - `docs/security/dependency-risk-register.md`
  - `docs/security/logging-and-error-handling.md`
- forbidden_files:
  - `docs/security/asvs/**`
- depends_on:
  - `A2-header-and-transport-policy`
  - `B2-method-and-upload-policy`
  - `C2-retention-and-image-metadata`
  - `D2-logging-and-dependency-posture`
  - `F1-frontend-security-alignment`
- tests_required:
  - `npm run format`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`
  - `npm run crypto:run`
- docs_required:
  - all touched requirement/security docs
- controls_intent:
  - turn implementation into auditable evidence

## Swarm Assignment Template

When executing with multiple agents, assign exactly one slice per agent.

Recommended initial swarm:

1. Agent 1: `X1-edge-response-helpers`
2. Agent 2: `X2-submit-request-guards`
3. Agent 3: `C2-retention-and-image-metadata` preparation and repository analysis only, no `worker/index.ts` edits until Wave 0 lands
4. Agent 4: `D2-logging-and-dependency-posture`

After Wave 0 merges:

1. Agent 1: `A2-header-and-transport-policy`
2. Agent 2: `B2-method-and-upload-policy`
3. Agent 3: `C2-retention-and-image-metadata`
4. Agent 4: `D2-logging-and-dependency-posture`

Then:

1. Agent 1: `F1-frontend-security-alignment`
2. Agent 2: `G1-evidence-consolidation`

## Handoff Contract Back To Auditor

Each completed slice must report:

1. changed files
2. tests run
3. docs updated
4. controls claimed ready for re-audit
5. residual risks or unresolved gaps

## Success Condition

This plan succeeds when:

1. multiple agents can work concurrently with disjoint write ownership,
2. `worker/index.ts` is no longer the reason every security change blocks every other one,
3. the repo moves from “ASVS backlog by chapter” to “execution queue by owned files,”
4. the auditor can re-run without guessing what each slice actually changed.
