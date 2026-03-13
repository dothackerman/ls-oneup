# Developer Local CLI Manual

## Purpose
Single source of truth for local CLI usage in `ls-oneup`:
1. Local setup
2. Local run and verification
3. Local quality loop
4. Manual Cloudflare release from local CLI

## Scope and Boundaries
1. This manual covers local machine workflows.
2. Cloudflare deployment is manual and human-operated.
3. Agents may prepare changes and release instructions, but should not execute release actions unless explicitly requested.

## Prerequisites
1. `git`
2. Node.js LTS (includes `npm`)
3. Network access for `npm install`
4. Optional for release: Cloudflare auth via `wrangler login`

## One-Time Setup
1. Clone and enter repository.
```bash
git clone https://github.com/dothackerman/ls-oneup
cd ls-oneup
```
2. Install dependencies.
```bash
npm install
```
3. Create local secrets from the example file.
```bash
cp .dev.vars.example .dev.vars
```
4. Apply local D1 migrations.
```bash
npm run db:migrate:local
```

## Daily Local Development
1. Start the app.
```bash
npm run dev
```
2. Open admin page:
- `http://localhost:8787/admin`
3. Farmer route (example token):
- `http://localhost:8787/p/example-token`

## Admin UX Controls (Local)
1. Onboarding (first load per browser profile):
- complete once with `Überspringen` or `Abschliessen`
- force reopen: `http://localhost:8787/admin?onboarding=force`
- disable for testing: `http://localhost:8787/admin?onboarding=off`
2. Dark mode scope:
- theme selector exists only on `/admin`
- preference persists per browser profile
- `/p/:token` remains light mode

## Local Quality Loop (Required)
Run this exact sequence before merging:
```bash
npm run format
npm run lint
npm run typecheck
npm run test:integration
npm run test:e2e
npm run crypto:run
npm run ci:local
```

## Useful Local Commands
1. Reset local data (D1 + R2 prototype state):
```bash
npm run db:reset:local
```
2. Build local production bundle:
```bash
npm run build
```
3. Browser debugging with Playwright CLI:
```bash
npm run pw:cli:init
npm run pw:cli:install-browser
npm run pw:cli:open -- http://127.0.0.1:8787/admin?onboarding=force
npm run pw:cli:list
npm run pw:cli:snapshot
```

### When To Use Playwright CLI
1. Use it for iterative UI/UX debugging where you need a clean browser session, DOM inspection, console logs, network logs, or repeated manual state transitions.
2. Prefer the existing Playwright test suite for automated regression coverage.
3. Prefer `npm run ux:capture` for repeatable screenshot plans when the workflow is already known.
4. Do not treat Playwright CLI as a CI requirement or a full replacement for browser devtools.

### Playwright CLI Stability Notes
1. The repo wrapper `scripts/playwright-cli-run.mjs` forces repo-local Chromium from `.playwright-browsers/`.
2. The wrapper also keeps CLI daemon/session state under `.playwright/daemon/` so the setup remains workspace-local and reproducible.
3. The base config lives in `.playwright/cli.config.json`; the wrapper generates `.playwright/cli.runtime.json` at runtime.
4. This setup avoids the CLI's Chrome-channel default and removes the need for a system Chrome install on this machine.

## Manual Cloudflare Release (From Local CLI)
Run only when release is explicitly requested and environment is ready.

1. Authenticate:
```bash
npx wrangler login
```
2. Verify local gate:
```bash
npm run crypto:run
npm run ci:local
```
3. Configure production crypto secrets:
```bash
echo '<token-hmac-keys-json>' | npx wrangler secret put TOKEN_HMAC_KEYS_JSON
echo '<submission-data-keys-json>' | npx wrangler secret put SUBMISSION_DATA_KEYS_JSON
```
4. Apply remote D1 migrations:
```bash
npx wrangler d1 migrations apply ls-oneup-db --remote --config wrangler.jsonc
```
5. Deploy:
```bash
npm run build
npx wrangler deploy --config wrangler.jsonc
```
6. Smoke checks:
- Admin route protection works (`/admin`, `/api/admin/*`)
- Farmer token open/submit works
- Submission visible in admin
- Image preview works in admin

## Troubleshooting
1. Missing dependencies after pulling:
```bash
npm install
```
2. Inconsistent local data during tests:
```bash
npm run db:reset:local
npm run db:migrate:local
```
3. Frontend import resolution issues after config changes:
- verify path aliases in `tsconfig.json` and `vite.config.ts`

## Related References
1. `README.md`
2. `docs/requirements/08-local-testing-and-first-release-runbook.md`
3. `docs/requirements/11-m1-test-traceability-matrix.md`
4. `docs/security/crypto/README.md`
5. `docs/security/crypto-policy.md`
6. `docs/security/crypto-inventory.json`
