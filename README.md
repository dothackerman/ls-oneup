# Leaf Sap One Up (`ls-oneup`)

Prototype repository for the Leaf Sap One Up project.

## Local CLI Manual

Use this as the single instruction manual for local CLI usage:

- [docs/developer-local-cli-manual.md](docs/developer-local-cli-manual.md)

## Technical References

### Requirements and contracts

- [Requirements index](docs/requirements/README.md)
- [Milestones and acceptance criteria](docs/requirements/02-milestones.md)
- [M1 API contract](docs/requirements/09-m1-api-contract.md)
- [M1 data model and migrations](docs/requirements/10-m1-data-model-and-migrations.md)
- [M1 test traceability matrix](docs/requirements/11-m1-test-traceability-matrix.md)
- [M1 security decision record](docs/requirements/12-m1-security-decision-record.md)
- [Local testing and first release runbook](docs/requirements/08-local-testing-and-first-release-runbook.md)

### Local quality commands

```bash
npm run db:reset:local
npm run format
npm run lint
npm run typecheck
npm run test:integration
npm run test:e2e
npm run ci:local
```

## Cloudflare Deployment (Manual, via Local CLI)

This repository uses [Cloudflare Workers](https://developers.cloudflare.com/workers/) with [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/), [D1](https://developers.cloudflare.com/d1/), and [R2](https://developers.cloudflare.com/r2/).

Use the full release runbook for policy/process details:

- [docs/requirements/08-local-testing-and-first-release-runbook.md](docs/requirements/08-local-testing-and-first-release-runbook.md)

Typical manual release flow from your machine:

1. Authenticate Wrangler.

```bash
npx wrangler login
```

2. Verify local quality gate is green.

```bash
npm run ci:local
```

3. Ensure production bindings/secrets are configured in [wrangler.jsonc](wrangler.jsonc).
4. Apply D1 migrations to the target environment.

```bash
npx wrangler d1 migrations apply ls-oneup-db --remote --config wrangler.jsonc
```

5. Build and deploy.

```bash
npm run build
npx wrangler deploy --config wrangler.jsonc
```

6. Run smoke checks:
- Admin route protection (for example with [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/))
- Token link open/submit flow
- Submission visibility in admin
