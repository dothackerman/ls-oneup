# Technical Decision Memo (M1 -> M2 Cost-Aware)

## Purpose
Compare two deployable, low-ops stack options for Milestone 1 under strict cost constraints, while considering likely costs for Milestone 2 if usage grows.

## Scope Context
This memo assumes the currently agreed requirements in:
- `01-customer-wishes.md`
- `02-milestones.md`

Milestone 1 requires:
1. Admin creates probe-specific one-time links + QR codes.
2. Farmer submits mandatory probe data in an online-only flow.
3. First successful submit wins; links expire after 60 days if unused.
4. Admin statuses: `offen`, `eingereicht`, `abgelaufen`.
5. Admin can override crop only and store `crop_overridden_at`.

Milestone 2 adds:
1. Mandatory whole-plant photo (white A3 + scale).
2. Optional leaf photo.
3. Manual BBCH by admin (exact or range, optional comment).

---

## Executive Summary
Two viable solutions satisfy the "free for M1" requirement:

1. Option A: Cloudflare end-to-end (`Pages + Workers + D1 + R2 + Access`)
2. Option B: Supabase backend (`Postgres + Storage + Auth + Edge Functions`) plus static frontend hosting

Research conclusion:
1. Option A is generally cheaper at M2 scale because image storage and egress profile are favorable (notably R2 egress pricing behavior).
2. Option B is often faster for implementation due to integrated backend services, but introduces a higher fixed monthly baseline once moving to paid reliability posture.
3. Inactivity behavior is a key differentiator for this business context.

---

## Option A: Cloudflare End-to-End

### Stack
1. Frontend: Cloudflare Pages (static app).
2. Backend API: Cloudflare Workers or Pages Functions.
3. Database: Cloudflare D1.
4. Image storage: Cloudflare R2.
5. Admin protection: Cloudflare Access (Zero Trust).

### Why It Fits M1
1. Serverless and low-ops deployment.
2. M1 invariants map cleanly to one guarded DB write for submit:
   - link valid
   - not expired
   - not yet submitted
3. Easy to keep disposable if prototype is dropped.

### Free-Tier Notes (M1)
1. M1 can run on free tiers if usage stays under limits.
2. Main risk is free-tier hard caps (requests / DB limits), not classic inactivity sleeping.
3. Operationally, failure modes are explicit and can be monitored.

### Cost Outlook for M2 (From Research)
Assumptions:
1. Scenarios provided by project: 10 GB / 50 GB / 200 GB stored images.
2. Submissions: 250 / 1,000 / 5,000 per month.
3. Currency conversion used by research: `1 USD = CHF 0.7720`.

Estimated monthly totals:
1. Pilot: `$0.00` (~`CHF 0.00`)
2. Early traction: `$0.60` (~`CHF 0.46`)
3. Growth: `$2.85` (~`CHF 2.20`)

Research confidence: high for storage-driven estimate.

---

## Option B: Supabase + Edge Functions

### Stack
1. Frontend: static host (provider-independent).
2. Backend API: Supabase Edge Functions.
3. Database: Supabase Postgres.
4. Image storage: Supabase Storage.
5. Admin auth: Supabase Auth.

### Why It Fits M1
1. Very fast to build with integrated DB/Auth/Storage.
2. Low infrastructure glue code.
3. Good ergonomics for rapid product iteration.

### Free-Tier Notes (M1)
1. M1 can be deployed on free tier.
2. Key risk for this project context: free-tier inactivity pausing behavior.
3. To remove that risk predictably, research indicates early move to Pro.

### Cost Outlook for M2 (From Research)
Assumptions:
1. Same scenario inputs as Option A.
2. Same conversion used by research: `1 USD = CHF 0.7720`.
3. Likely case assumes image egress remains under included Pro quota.

Estimated monthly totals:
1. Pilot: `$25.00` (~`CHF 19.30`)
2. Early traction: `$25.00` (~`CHF 19.30`)
3. Growth: `$27.10` (~`CHF 20.92`)

Research confidence:
1. High for fixed Pro baseline.
2. Medium for egress sensitivity (depends on image size and viewing behavior).

---

## Side-by-Side Summary

| Dimension | Option A: Cloudflare | Option B: Supabase |
|---|---|---|
| M1 free deployability | Yes | Yes |
| M1 reliability risk | Free-tier hard caps | Free-tier inactivity pause risk |
| M2 cost trend in report scenarios | Very low variable cost | Mostly fixed monthly base |
| Ops complexity | Moderate | Low-to-moderate |
| Portability tradeoff | D1 SQLite semantics | Postgres portability |

---

## Recommendation (From Research)
Prefer Option A (Cloudflare end-to-end) for this prototype phase, because:
1. It best matches strict cost constraints from M1 into M2.
2. It avoids the specific inactivity-pause concern raised for this business context.
3. It preserves a disposable architecture while still offering a scale path.

Option B remains a valid alternative if faster initial implementation is prioritized over lowest ongoing cost.

---

## Sources (As Provided by Research)

### Cloudflare
1. Workers pricing: `https://developers.cloudflare.com/workers/platform/pricing/`
2. Workers limits: `https://developers.cloudflare.com/workers/platform/limits/`
3. D1 overview: `https://developers.cloudflare.com/d1/`
4. D1 pricing: `https://developers.cloudflare.com/d1/platform/pricing/`
5. R2 pricing: `https://developers.cloudflare.com/r2/pricing/`
6. Pages limits: `https://developers.cloudflare.com/pages/platform/limits/`
7. Pages Functions + Workers billing model: `https://developers.cloudflare.com/pages/functions/pricing/`
8. Access / Zero Trust pricing: `https://www.cloudflare.com/plans/zero-trust-services/`

### Supabase
1. Pricing: `https://supabase.com/pricing`
2. Free-plan inactivity guidance / production checklist:
   `https://supabase.com/docs/guides/platform/going-into-prod`
3. HTTP 540 paused project behavior:
   `https://supabase.com/docs/guides/troubleshooting/http-status-codes`
4. Compute usage / plan cost behavior:
   `https://supabase.com/docs/guides/platform/manage-your-usage/compute-size`
5. Storage usage pricing:
   `https://supabase.com/docs/guides/platform/manage-your-usage/storage-size`
6. Egress usage pricing:
   `https://supabase.com/docs/guides/platform/manage-your-usage/egress`
7. Edge Functions usage pricing:
   `https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations`
8. Spend cap:
   `https://supabase.com/docs/guides/platform/manage-your-usage/spend-cap`

### Exchange Rate
1. Swiss National Bank exchange rates:
   `https://www.snb.ch/en/the-snb/mandates-goals/statistics/statistics-pub/current_interest_exchange_rates`

## Notes
1. This document records the research-agent memo; it does not replace implementation validation.
2. Re-check pricing before build kickoff, because platform pricing and limits can change.
