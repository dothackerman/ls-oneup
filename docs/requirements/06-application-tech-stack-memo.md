# Application Tech Stack Memo (Cloudflare Runtime)

## Purpose
Define the application-layer stack on top of the already selected Cloudflare deployment platform for M1.

## Decision
Use a single full-stack project with:
1. `React` + `Vite` for UI.
2. `Hono` for API routes.
3. `Zod` for shared validation.
4. `Drizzle ORM` + `Drizzle Kit` for D1 schema and migrations.
5. `Cloudflare D1` for relational data.
6. `Cloudflare R2` for image objects.
7. `Cloudflare Access` for admin route protection.
8. `Vitest` + `Playwright` for testing.

This is the primary stack.  
Fallback stack remains available: `Astro + Hono + direct D1 SQL + Wrangler migrations + Workers Vitest pool`.

## Clarification Addendum (Latest Decisions)
1. Frontend image compression is preferred in M1, but backend validation is mandatory and authoritative.
2. Backend enforces:
   - exactly one image
   - MIME whitelist: `image/jpeg`, `image/png`
   - max payload size: 2 MB
3. Image persistence model:
   - binary object in R2
   - reference + metadata in D1 (`image_key`, `image_mime`, `image_bytes`, optional upload timestamp)
   - admin UI reads image via D1 reference
4. If R2 upload succeeds but conditional D1 submit write fails, perform best-effort orphan cleanup in R2 and log outcome.
5. M1 keeps prototype pragmatism for device-specific upload/compression edge cases and iterates from field feedback.

## Why This Stack
1. Good speed for SPA/admin workflow and form-heavy UX.
2. Runtime compatibility with Cloudflare Workers is strong for core components.
3. Keeps implementation practical for a multi-agent, local-first workflow.
4. Preserves a low-cost path for M1 while keeping an M2 extension path.

## M1 Design Constraints (Implementation Guardrails)
1. Keep Worker request path minimal.
2. No server-side image processing in M1.
3. Enforce exactly one image (`jpeg/png`) and max 2 MB.
4. Enforce one-time token lifecycle in DB write path:
   - valid token
   - not expired
   - not already submitted
5. Keep schemas and queries simple (YAGNI).
6. Keep backend dependency set Workers-compatible:
   - avoid Node-only runtime dependencies in Worker code (`fs`, `net`, `tls`, `child_process`, native Node add-ons)
   - keep `nodejs_compat` disabled by default
   - only enable compatibility mode via explicit documented exception

## Minimal Architecture Mapping
1. Admin (Access-protected) creates probes and receives per-probe token/link.
2. Farmer submits online-only form via public token link.
3. Image stored in R2; only object key and metadata stored in D1.
4. Submission acceptance uses a conditional DB update to enforce "first submit wins".
5. Admin list derives status:
   - `eingereicht` when submitted
   - `abgelaufen` when expired and not submitted
   - `offen` otherwise

## API Surface (M1)

Admin:
1. `POST /api/admin/probes`
2. `GET /api/admin/probes`
3. `PATCH /api/admin/probes/:id/crop-override`

Public:
1. `GET /p/:token`
2. `GET /api/probe/:token`
3. `POST /api/probe/:token/submit`

## Risk Register (from Research)
1. Runtime/library compatibility drift.
2. Free-tier CPU limit pressure if request handlers become heavy.
3. GPS capture reliability and permission UX.
4. Multipart parsing/file validation edge cases.
5. Race conditions on concurrent submission.
6. Access misconfiguration for admin routes.
7. Testing/tooling version friction.

## Risk Mitigation Baseline
1. Prefer Web-standards-first libraries and pinned versions.
2. Keep image handling client-side + strict server checks only.
3. Use one conditional DB write for submit semantics.
4. Add explicit German error states for location/permissions/upload failures.
5. Keep admin routes protected via Access and document recovery flow.
6. Keep local-first quality gates before any manual cloud release.
7. Add backend guardrails to prevent Node-runtime drift:
   - CI/lint checks to block Node-only imports in Worker modules
   - at least one integration test path executed in Workers-compatible runtime

## Source Set (from Research Memo)
1. Cloudflare Workers, D1, R2, Access, logging, limits, Vite plugin docs.
2. Official docs for React, Vite, Hono, Zod, Drizzle, Astro, Valibot, Vitest, Playwright.
3. Web platform references for geolocation, file input constraints, and request form parsing.

For full source links and detailed cost/deployment comparison:
- `04-tech-stack-decision-memo.md`
