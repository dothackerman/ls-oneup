# AGENTS.md - ls-oneup

Minimal first-read dispatcher for new agent sessions.

## Start Here (Always)
1. `docs/requirements/00-index.md`
2. `.agents/00-router.md`
3. `.agents/20-task-routing.json`

## Classify Task First
Choose one primary route before loading more docs:
1. UX/UI/onboarding/visual
2. Backend/runtime/API behavior
3. Data model/migrations/contract
4. Security/ASVS
5. Docs-only

If unsure, start with the smallest route and expand only if blocked.

## Route To Docs (Load Only What Is Needed)
1. UX route:
   - `docs/requirements/14-frontend-styling-policy.md`
   - `docs/requirements/15-ux-governance.md`
   - `docs/requirements/16-onboarding-parity.md`
   - `.agents/checklists/ux-change.md`
2. Backend route:
   - `docs/requirements/07-m1-agent-execution-contract.md`
   - `docs/requirements/08-local-testing-and-first-release-runbook.md`
   - `.agents/checklists/backend-change.md`
3. Data/contract route:
   - `docs/requirements/09-m1-api-contract.md`
   - `docs/requirements/10-m1-data-model-and-migrations.md`
   - `.agents/checklists/data-contract-change.md`
4. Security route:
   - `docs/requirements/12-m1-security-decision-record.md`
   - `docs/requirements/13-m1-asvs-audit-agent-and-checklist.md`
   - `.agents/checklists/backend-change.md`

## Architecture Decision Pointers
1. Deployment/application stack decisions: `docs/requirements/04-tech-stack-decision-memo.md`, `docs/requirements/06-application-tech-stack-memo.md`
2. Security decisions: `docs/requirements/12-m1-security-decision-record.md`
3. UX governance decisions: `docs/requirements/15-ux-governance.md`, `docs/requirements/16-onboarding-parity.md`

## QA Matrix
1. Always:
   - `npm run format`
   - `npm run lint`
   - `npm run typecheck`
2. Backend/data/security changes:
   - `npm run test:integration`
   - `npm run test:e2e` if user-visible flow changes
3. UX changes:
   - `npm run test:integration`
   - `npm run test:e2e`
   - `npm run ux:capture -- --plan <plan-file>` when runnable
   - `npm run pw:cli -- <command>` for clean-session interactive UI debugging when screenshots alone are insufficient

## Git Cadence
1. One logical requirement-linked slice per commit.
2. Commit only after required checks are green.
3. Push after each green logical slice.

## Hard Constraints
1. Keep changes minimal and requirement-linked.
2. Update requirement docs in the same change when behavior/contract changes.
3. Do not run Cloudflare release/deploy commands unless explicitly requested.
