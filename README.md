# Leaf Sap One Up (`ls-oneup`)

Prototype repository for the Leaf Sap One Up project.

## Current Repository State

Milestone 1 implementation is now scaffolded and functional:

- Cloudflare Worker API (`Hono`) in `worker/`
- React + Vite frontend (`/admin` and `/p/:token`) in `src/`
- D1 migration baseline in `migrations/`
- Integration tests (Workers semantics) and Playwright E2E tests in `tests/`

### Available documents

- `docs/requirements/README.md`
  - index of requirement and implementation-guidance documents.
- `docs/requirements/01-customer-wishes.md`
  - Consolidated functional wishes and constraints for Milestone 1.
- `docs/requirements/02-milestones.md`
  - Shippable milestone definitions (M1 to M3) with scope and acceptance criteria.
- `docs/requirements/03-open-questions.md`
  - Remaining open and deferred decisions (technical, governance, later milestones).
- `docs/requirements/04-tech-stack-decision-memo.md`
  - Research-based comparison of two deployment/stack options with M1-free and M2-cost outlook.
- `docs/requirements/05-agent-tooling-and-local-flow.md`
  - Multi-agent tooling setup, read-first MCP usage, and manual-only release policy.
- `docs/requirements/06-application-tech-stack-memo.md`
  - Selected application stack on Cloudflare (SPA-first) with architecture and risk baseline.
- `docs/requirements/07-m1-agent-execution-contract.md`
  - M1 implementation contract for agent/subagent execution and quality gates.
- `docs/requirements/08-local-testing-and-first-release-runbook.md`
  - local testing getting-started and manual first-release proposal for Cloudflare.
- `docs/requirements/09-m1-api-contract.md`
  - endpoint-level API contract for M1.
- `docs/requirements/10-m1-data-model-and-migrations.md`
  - D1 schema baseline and migration rules.
- `docs/requirements/11-m1-test-traceability-matrix.md`
  - acceptance-criteria-to-test mapping for M1.
- `docs/requirements/12-m1-security-decision-record.md`
  - ADR-style token-link security decision for M1.

## Project Focus (now)

The current focus is Milestone 1 (MVP):

- Admin creates probe-specific one-time links and QR codes.
- Farmer submits mandatory probe context data (online-only flow).
- Admin can review submissions and override crop name.

## Next Steps

1. Keep extending coverage for the remaining planned M1 matrix IDs.
2. Prepare manual first Cloudflare release using `08-local-testing-and-first-release-runbook.md`.
3. Plan M2 scope items once M1 release feedback is collected.

## Local Commands

```bash
npm run dev
npm run test:integration
npm run test:e2e
npm run ci:local
```
