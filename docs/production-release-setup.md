# Production Release Setup (GitHub Actions)

Use this guide to configure the first production release with an explicit local/prod split.

## 1) Configure production Wrangler file

1. Open `wrangler.production.jsonc`.
2. Replace placeholders:
   - `routes[0].pattern` with your subdomain route (`subdomain.domain/*`)
   - `routes[0].zone_name` with your root domain
   - `vars.APP_BASE_URL` with your public base URL (`https://subdomain.domain`)
   - `d1_databases[0].database_id` with your real D1 database id
   - `r2_buckets[0].bucket_name` with your real R2 bucket name
3. Keep `vars.DEV_BYPASS_ACCESS` set to `"false"` for production.

## 2) Provision production D1 and R2 resources

Run once from your machine (with Wrangler auth):

```bash
npx wrangler d1 create ls-oneup-db
npx wrangler r2 bucket create <your-prod-r2-bucket-name>
```

Use the returned D1 database UUID and your R2 bucket name in `wrangler.production.jsonc`.

## 3) Configure runtime crypto secrets in Cloudflare

Set Worker runtime secrets in Cloudflare (not in git):

```bash
echo '<token-hmac-keys-json>' | npx wrangler secret put TOKEN_HMAC_KEYS_JSON --config wrangler.production.jsonc
echo '<submission-data-keys-json>' | npx wrangler secret put SUBMISSION_DATA_KEYS_JSON --config wrangler.production.jsonc
```

## 4) Configure GitHub Actions production environment

Create GitHub Environment `production` and add secrets:

1. `CLOUDFLARE_API_TOKEN`
2. `CLOUDFLARE_ACCOUNT_ID`

Recommended protections:

1. Required reviewers for deployment/migration workflows
2. Restrict deployment to `main`

## 5) Protect admin routes with Cloudflare Access

Configure Access policy for:

1. `/admin*`
2. `/api/admin/*`

No local config is required for Access itself. Local development continues to use `wrangler.jsonc` with `DEV_BYPASS_ACCESS=true`.

## 6) Production workflows

Two manual workflows are available:

1. `.github/workflows/migrate-production.yml`
   - requires typed confirmation
   - lists pending migrations
   - blocks potentially destructive SQL unless explicitly allowed
2. `.github/workflows/deploy-production.yml`
   - requires typed confirmation
   - deploys using `wrangler.production.jsonc`

Recommended first release order:

1. Run migration workflow
2. Run deploy workflow
3. Run post-deploy smoke checks

## 7) Optional local CLI equivalents

These commands are intentionally guarded:

```bash
PROD_CONFIRM=I_UNDERSTAND_THIS_TARGETS_PRODUCTION PROD_MIGRATION_CONFIRM=MIGRATE_PROD npm run db:migrate:prod
PROD_CONFIRM=I_UNDERSTAND_THIS_TARGETS_PRODUCTION npm run deploy:prod
```

If a migration includes destructive SQL, set this only when intentional:

```bash
ALLOW_DESTRUCTIVE_MIGRATIONS=true
```
