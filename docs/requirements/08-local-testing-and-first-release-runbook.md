# Local Testing and First Release Runbook

## Purpose
Provide:
1. A getting-started path for local development/testing.
2. A proposed manual first-release procedure for Cloudflare.

This is a runbook document.  
No deployment automation is executed from here.

## Getting Started (Local Testing)

### Prerequisites
1. Node.js LTS (current project target to be fixed during scaffolding)
2. Package manager (`npm` by default unless project decides otherwise)
3. Cloudflare `wrangler` CLI installed
4. Git configured locally

### Target Script Contract
The application scaffold must provide these scripts:
1. `npm run format`
2. `npm run lint`
3. `npm run test:integration`
4. `npm run test:e2e`
5. `npm run dev`

Optional but recommended:
1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run ci:local` (single command to run full local quality loop)

### Local Quality Loop (Mandatory)
1. Implement change
2. `npm run format`
3. `npm run lint`
4. `npm run test:integration`
5. If green: commit and push

Before milestone sign-off:
1. Run complete E2E suite (`npm run test:e2e`) covering M1 business logic.

### Local Data/Service Expectations
1. D1 local database and migrations run locally before integration tests.
2. R2 interactions are testable in local/dev mode (or mocked where needed).
3. No cloud deployment is required for local testing.

## Proposed First Release (Cloudflare) - Manual Only

### Preconditions
1. Cloudflare auth is configured on release machine.
2. Access policies for `/admin` and `/api/admin/*` are prepared.
3. Full local quality loop is green.
4. M1 E2E suite is green.

### Manual Release Steps (Proposal)
1. Confirm release commit on `main`.
2. Verify environment/secrets/bindings in Cloudflare config.
3. Apply D1 migrations for target environment.
4. Deploy Worker/static assets manually using `wrangler`.
5. Run post-deploy smoke checks:
   - admin route protected by Access
   - farmer token link flow works
   - submission persists and admin can view image
   - status derivation is correct
6. Record release note in docs/changelog.

### Post-Release Checks
1. Verify logs for submit/validation errors.
2. Verify no obvious orphan object accumulation.
3. Confirm error UX paths (used link, expired link, GPS denied, invalid image).

## Out of Scope in This Phase
1. Agent-triggered deployment.
2. Fully automated CI/CD release pipelines.
3. Production-scale observability tuning.
