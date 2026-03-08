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
3. Apply local D1 migrations.
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

## Manual Cloudflare Release (From Local CLI)
Run only when release is explicitly requested and environment is ready.

1. Authenticate:
```bash
npx wrangler login
```
2. Verify local gate:
```bash
npm run ci:local
```
3. Apply remote D1 migrations:
```bash
npx wrangler d1 migrations apply ls-oneup-db --remote --config wrangler.jsonc
```
4. Deploy:
```bash
npm run build
npx wrangler deploy --config wrangler.jsonc
```
5. Smoke checks:
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
