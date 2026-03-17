# Local Testing and First Release Runbook

## Purpose
Provide:
1. A getting-started path for local development/testing.
2. A first-release procedure for Cloudflare with explicit GitHub Actions production workflows.

This is a runbook document.

## Getting Started (Local Testing)

### Prerequisites
1. Node.js LTS (current project target to be fixed during scaffolding)
2. Package manager (`npm` by default unless project decides otherwise)
3. Cloudflare `wrangler` CLI installed
4. Git configured locally
5. Local secrets file `.dev.vars` created from `.dev.vars.example`

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
4. `npm run test:manual:prep` (start local services for browser-based manual testing)
5. `npm run crypto:run` (verify crypto inventory metadata and discovery coverage)

### Local Quality Loop (Mandatory)
1. Implement change
2. `npm run format`
3. `npm run lint`
4. `npm run crypto:run`
5. `npm run test:integration`
6. If green: commit and push
7. If the change affects security-relevant behavior, review `../security/logging-and-error-handling.md` and `../security/dependency-risk-register.md` in the same slice.

Before milestone sign-off:
1. Run complete E2E suite (`npm run test:e2e`) covering M1 business logic.
2. Ensure integration and E2E test execution target local Workers runtime semantics.

### Local Data/Service Expectations
1. D1 local database and migrations run locally before integration tests.
2. R2 interactions are testable in local/dev mode (or mocked where needed).
3. No cloud deployment is required for local testing.
4. Local Workers runtime testing is not constrained by Cloudflare free-tier deployment/build limits.
5. Production secrets are not committed to `wrangler.production.jsonc` (or any repo config); local secrets are loaded from `.dev.vars` used with `wrangler.jsonc`.

## First Release (Cloudflare) - GitHub Actions Manual Dispatch

### Preconditions
1. Production resources are provisioned (D1 + R2) and bound in `wrangler.production.jsonc`.
2. Access policies for `/admin` and `/api/admin/*` are prepared.
3. Full local quality loop is green.
4. M1 E2E suite is green.
5. Production token HMAC and submission-encryption secrets are configured in Cloudflare Worker Secrets, not committed to the repo.
6. GitHub Environment `production` is configured with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

### Deployment-Only Browser And Transport Controls
1. The Worker enforces response-level browser headers for sensitive API and app-shell routes, but transport guarantees still live at the Cloudflare edge, not in local HTTP dev.
2. HTTPS redirect policy, TLS mode, certificate lifecycle, and HSTS (`Strict-Transport-Security`) must be configured on the deployed zone or edge service. They are not implied by Wrangler config files.
3. HSTS should only be enabled on the deployed HTTPS hostname after confirming the admin and farmer flows are stable over TLS; local `http://localhost` development intentionally does not emulate HSTS.
4. If Cloudflare Access or upstream proxy policy ever strips security headers, release verification must treat that as a deployment failure rather than assuming the Worker alone provides complete browser posture.

### Release Steps
1. Confirm release commit on `main`.
2. Verify environment/secrets/bindings in `wrangler.production.jsonc` and Cloudflare.
3. Configure runtime crypto secrets with `wrangler secret put` (one-time or rotation flow).
4. Confirm edge transport settings for the production hostname:
   - HTTPS redirect enabled
   - TLS mode appropriate for the origin path
   - HSTS configured at the zone or edge layer if the hostname is ready for it
5. Run GitHub Actions workflow `.github/workflows/migrate-production.yml` with required confirmation token.
6. Run GitHub Actions workflow `.github/workflows/deploy-production.yml` with required confirmation token.
7. Run post-deploy smoke checks:
   - admin route protected by Access
   - farmer token link flow works
   - submission persists and admin can view image
   - status derivation is correct
8. Record release note in docs/changelog.

### Post-Release Checks
1. Verify logs for submit/validation errors using `../security/logging-and-error-handling.md` as the field and event contract.
2. Verify no obvious orphan object accumulation.
3. Confirm error UX paths (used link, expired link, GPS denied, invalid image).
4. Review the current dependency and platform risk notes in `../security/dependency-risk-register.md` against the deployed topology.

## Out of Scope in This Phase
1. Agent-triggered deployment.
2. Automatic deploy-on-push to production (deploys remain manual-dispatch with explicit confirmation).
3. Production-scale observability tuning.
