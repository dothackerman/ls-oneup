# UX Multi-Agent Runbook (Whole Circle)

## Purpose
Single reference for the full cycle:
1. parallel UX implementation (3 lanes),
2. integration and validation,
3. post-implementation architecture reassessment.

## Baseline
1. Start from commit: `c2a0b31`
2. Core plan reference: `docs/plans/2026-03-10-ux-parallelization-and-improvements-plan.md`

## Global Rules (All Agents)
1. You are not alone in the codebase; do not revert others' changes.
2. Stay within lane ownership unless coordinated.
3. No deployment commands.
4. Must run: `npm run format`, `npm run lint`, targeted `npm run test:e2e`, and `npm run ux:capture`.
5. Report changed files + test/capture evidence + risks.

## Lane A (Onboarding UX)
Branch:
1. `feat/ux-lane-a-onboarding`

Owns:
1. `src/features/admin/onboarding/*`
2. `src/shared/components/patterns/spotlight-overlay.tsx` (if needed)
3. onboarding-specific e2e/capture files

Goals:
1. fix missing-target onboarding blur/dim behavior,
2. ensure each onboarding step has a highlight target,
3. add onboarding-only preview blocks where data is absent (clearly non-interactive "Vorschau").

Minimum tests:
1. `npm run test:e2e -- -g "E2E-ADMIN-008|E2E-ADMIN-010|E2E-ADMIN-011"`

## Lane B (Admin Readability + Link Cards)
Branch:
1. `feat/ux-lane-b-admin-cards-contrast`

Owns:
1. `src/features/admin/new-links/*`
2. admin table area in `src/App.tsx`
3. `src/styles.css` (exclusive token owner)
4. admin-specific e2e/capture files

Goals:
1. improve dark-mode table readability,
2. improve generated card next-action clarity (`Formular öffnen` + clear hierarchy),
3. preserve dark-mode scope behavior.

Minimum tests:
1. `npm run test:e2e -- -g "E2E-ADMIN-001|E2E-ADMIN-002|E2E-ADMIN-012|E2E-ADMIN-014|E2E-ADMIN-009"`

## Lane C (Mobile Density + Farmer Locale)
Branch:
1. `feat/ux-lane-c-mobile-farmer-locale`

Owns:
1. `src/features/farmer/form/*`
2. mobile density tuning in `src/features/admin/new-links/*` (coordinate with Lane B)
3. farmer/responsive e2e/capture files

Goals:
1. improve admin generated-card mobile density (actions visible sooner),
2. replace mixed-language farmer file input UI shell with accessible German text.

Minimum tests:
1. `npm run test:e2e -- -g "E2E-FARM-001|E2E-FARM-004|E2E-FARM-006|E2E-FARM-007|E2E-ADMIN-007"`

## Integration Agent (Merge + Final Gate)
Branch:
1. `feat/ux-integration-finalize`

Inputs:
1. Lane A/B/C branches.

Tasks:
1. merge all lane branches,
2. resolve conflicts without reverting lane intent,
3. run final gate:
   - `npm run format`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:integration`
   - `npm run test:e2e`
4. run consolidated UX capture for:
   - onboarding (desktop/mobile, light/dark),
   - admin generated cards (desktop/mobile, light/dark),
   - farmer flow (desktop/mobile),
   - admin-dark/farmer-light scope check.

Output:
1. integrated diff summary,
2. full validation evidence,
3. list of residual risks.

## Architecture Review Agent (Phase 4)
Branch:
1. `feat/ux-architecture-review`

Goal:
1. assess whether larger refactor is needed for >3 lanes after integration.

Evaluate:
1. merge conflict hotspots,
2. test churn and ownership overlap,
3. remaining coupling in `src/App.tsx` and shared style surfaces.

Output:
1. decision (`defer` or `propose larger refactor`),
2. rationale,
3. if needed: scoped refactor proposal with phased rollout.
