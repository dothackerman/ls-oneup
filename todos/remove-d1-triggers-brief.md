# CE Brief: Remove D1 Triggers, Harden Worker-Layer Validation

## Context

D1's migration runner splits SQL on semicolons before sending to the database.
`CREATE TRIGGER...BEGIN...END` blocks contain inner semicolons that cause
`incomplete input: SQLITE_ERROR [code: 7500]` on every trigger migration.

The triggers were defense-in-depth — they duplicated validation already present
in the Worker (Zod schemas, business logic). Removing them is the correct tradeoff.
The Worker layer is the authoritative validation boundary.

## Decision to document

Add a note to `docs/maintainers/production-release.md` and/or `docs/security/`
explaining:
- D1 does not reliably support CREATE TRIGGER via the migrations runner
- Validation is enforced at the Worker layer (Zod + business logic)
- SQLite triggers must not be added to future migrations

## Tasks

### 1. Remove trigger migration files

Delete the following migration files — they have never applied to production:
- `migrations/0002a_m1_submit_insert_guard.sql`
- `migrations/0002b_m1_submit_update_guard.sql`
- `migrations/0003b_m1_drop_old_triggers.sql`
- `migrations/0003c_m1_drop_old_triggers.sql`
- `migrations/0003d_m1_submit_insert_guard.sql`
- `migrations/0003e_m1_submit_update_guard.sql`

Keep:
- `migrations/0001_m1_init.sql` — already applied ✅
- `migrations/0003a_m1_add_submission_ciphertext.sql` — pending, no trigger, fine

### 2. Update schema.ts

Remove trigger definitions from `packages/db/src/schema.ts` if any exist.
Check `worker/` for any trigger creation in runtime code and remove.

### 3. Migrate INT-DATA-002 test

`tests/integration/m1.integration.test.ts` test `INT-DATA-002` currently
validates that D1 rejects invalid enum values via the trigger. This must be
replaced with Worker-layer validation tests:

- Test that `POST /api/probe/:token/submit` with invalid `plant_vitality` returns 400
- Test that `POST /api/probe/:token/submit` with invalid `soil_moisture` returns 400
- Test that `POST /api/probe/:token/submit` with invalid `gps_lat` (out of range) returns 400
- Test that `POST /api/probe/:token/submit` with invalid `image_mime` returns 400
- Test that `POST /api/probe/:token/submit` with oversized `image_bytes` returns 400
- Test that `POST /api/probe/:token/submit` with missing required fields returns 400

These should cover the same scenarios the trigger covered, but at the HTTP
boundary — the correct place for this project.

### 4. Document the decision

In `docs/security/` or `docs/maintainers/`, add a short ADR or note:
- What the triggers did
- Why they were removed
- What replaces them (Worker-layer Zod validation)
- Rule: no future migrations should contain CREATE TRIGGER

## Constraints

- Branch: `refactor/remove-d1-triggers`
- Commit iteratively, push after each logical step
- Run `npm run typecheck && npm run test:integration` after each commit
- PR title: `refactor: remove D1 triggers, enforce validation at Worker layer`
- Do NOT touch e2e tests, wrangler configs, or Worker business logic
- Do NOT modify the Zod schemas — they are already correct
