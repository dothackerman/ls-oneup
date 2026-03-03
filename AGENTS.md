# AGENTS.md - ls-oneup (M1)

## Purpose
Define how coding agents and subagents execute Milestone 1 in this repository.

This file is orchestration-only:
1. It does not duplicate product requirements, API contracts, data model, or security rules.
2. It points to the canonical documents under `docs/requirements/`.

## Scope
1. Implement only Milestone 1.
2. Do not implement M2/M3 features.
3. Do not deploy to Cloudflare from agents in this phase.

## Source of Truth Map
1. Product intent and wishes: `docs/requirements/01-customer-wishes.md`
2. Milestone scope and acceptance criteria: `docs/requirements/02-milestones.md`
3. Open/deferred topics: `docs/requirements/03-open-questions.md`
4. Deployment stack decision: `docs/requirements/04-tech-stack-decision-memo.md`
5. Agent tooling and local-first policy: `docs/requirements/05-agent-tooling-and-local-flow.md`
6. Application stack decision: `docs/requirements/06-application-tech-stack-memo.md`
7. M1 execution quality contract: `docs/requirements/07-m1-agent-execution-contract.md`
8. Local testing and release runbook: `docs/requirements/08-local-testing-and-first-release-runbook.md`
9. API and UI route contract: `docs/requirements/09-m1-api-contract.md`
10. D1 schema and migration policy: `docs/requirements/10-m1-data-model-and-migrations.md`
11. Test traceability matrix: `docs/requirements/11-m1-test-traceability-matrix.md`
12. Token-link security ADR: `docs/requirements/12-m1-security-decision-record.md`

## Repo-Level Agent Rules
1. Respect `SOLID`, `YAGNI`, `KISS`, high cohesion, low coupling.
2. Keep changes small, reviewable, and requirement-linked.
3. No hidden assumptions: if behavior changes, update referenced docs in the same change.
4. Prefer Web-standards runtime compatibility for Workers code paths.

## Required Execution Flow (Per Change)
1. Discover relevant requirements from the Source of Truth Map.
2. Implement minimal slice.
3. Run local quality loop:
   - formatter
   - linter
   - integration tests (Workers-runtime semantics)
4. If all green: commit and push.
5. If a step fails: do not commit; fix and rerun from the failed step.

## Subagent Structure (Default)
1. `research-subagent`
   - resolve unknowns, verify docs, and propose implementation details when missing.
2. `discovery-subagent`
   - map current codebase structure, dependencies, and impact areas.
3. `implementation-subagent`
   - implement feature slices with explicit requirement linkage.
4. `quality-subagent`
   - run/maintain formatter, lint, integration tests, and E2E coverage.
5. `docs-subagent`
   - maintain requirement consistency and ADR updates.

Use only the minimal set needed for a task.

## Decision Logging (ADR-Inspired)
1. Any non-trivial technical decision discovered during implementation must be documented.
2. Decision docs must include:
   - context
   - decision
   - consequences
   - references
3. Prefer updating existing requirement docs when the decision belongs there; create a new ADR-style doc only when needed.

## Verification Protocol (Point 10 Clarified)
Verification protocol means the required evidence an agent must produce before claiming a task is done.

Minimum evidence:
1. Requirement trace: which M1 acceptance criterion is covered.
2. Test evidence: which integration/E2E tests were run and passed.
3. Contract evidence: API/data/security docs are still aligned (or updated).
4. Runtime evidence: behavior validated under local Workers-runtime semantics.

M1 completion additionally requires:
1. Full M1 acceptance coverage implemented.
2. Complete M1 E2E suite green.
3. `ci:local` green (once scaffold defines it).

## Deployment Boundary
1. Agents may prepare deployment instructions and configs.
2. Agents must not execute Cloudflare release/deployment commands in this phase.
3. Human operator performs first release manually per runbook.

## File Growth Policy
1. Keep this top-level `AGENTS.md` as the single repo-wide contract for now.
2. Introduce subdirectory-level agent files only if codebase size/complexity after M1 justifies it.
