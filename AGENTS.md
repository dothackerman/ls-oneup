# AGENTS.md - ls-oneup

## Purpose
Define how coding agents and subagents execute work in this repository.

This file is orchestration-only:
1. It does not duplicate product requirements, API contracts, data model, or security rules.
2. It points to canonical documents under `docs/requirements/`.

## Active Scope Resolution
1. Delivery scope comes from the current task prompt plus the requirements docs.
2. If prompt and docs conflict, stop and clarify before implementation.
3. Do not implement out-of-scope future features preemptively.

## Source of Truth
1. Start with `docs/requirements/README.md` to locate the current requirement set.
2. Use the referenced requirement docs as authoritative for behavior and constraints.
3. Keep this file stable and reusable; store feature/milestone specifics in requirement docs, not here.
4. For frontend UX/styling work, follow `docs/requirements/14-frontend-styling-policy.md`.

## Repo-Level Agent Rules
1. Respect `SOLID`, `YAGNI`, `KISS`, high cohesion, low coupling.
2. Keep changes small, reviewable, and requirement-linked.
3. No hidden assumptions: if behavior changes, update the relevant docs in the same change.
4. Prefer Web-standards runtime compatibility for Workers code paths.

## Required Execution Flow (Per Change)
1. Discover applicable requirements and acceptance criteria.
2. Implement the minimal slice.
3. Run local quality loop:
   - formatter
   - linter
   - integration tests (Workers-runtime semantics where applicable)
   - for UX-affecting changes: screenshot-based visual inspection using the project UX capture flow
4. If all green: commit and push.
5. One commit per requirement-linked slice after green checks.
6. If a step fails: do not commit; fix and rerun from the failed step.
7. For UX work, "green" includes screenshot-based visual inspection per `docs/requirements/14-frontend-styling-policy.md`, not just passing functional tests.

## Subagent Structure (Default)
1. `research-subagent`
   - resolve unknowns and verify technical decisions.
2. `discovery-subagent`
   - map codebase structure, dependencies, and impact areas.
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
3. Prefer updating existing docs when the decision belongs there; create a new ADR-style doc only when needed.

## Verification Protocol
Verification protocol means the required evidence an agent must produce before claiming a task is done.

Minimum evidence:
1. Requirement trace: which active acceptance criterion is covered.
2. Test evidence: which integration/E2E tests were run and passed.
3. Contract evidence: API/data/security docs are still aligned (or updated).
4. Runtime evidence: behavior validated under local runtime semantics.

Feature/milestone completion additionally requires:
1. Full acceptance-criteria coverage implemented.
2. Required integration/E2E suite green.
3. `ci:local` green (once scaffold defines it).

## Deployment Boundary
1. Agents may prepare deployment instructions and configs.
2. Agents must not execute Cloudflare release/deployment commands unless explicitly requested and environment is ready.
3. Human operator performs release actions by default.

## File Growth Policy
1. Keep this top-level `AGENTS.md` as the single repo-wide contract for now.
2. Introduce subdirectory-level agent files only when codebase size/complexity justifies it.
