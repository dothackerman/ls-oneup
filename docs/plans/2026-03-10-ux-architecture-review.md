# UX Architecture Review (Phase 4)

## Context
This review assesses the integrated UX lane run executed from baseline commit `c2a0b31` through the final integration branch.

Integrated inputs:
1. `feat/ux-lane-a-onboarding`
2. `feat/ux-lane-b-admin-cards-contrast`
3. `feat/ux-lane-c-mobile-farmer-locale`
4. `feat/ux-integration-finalize`

Review goal:
1. Decide whether the frontend needs a larger refactor before the next round of parallel UX work.

## Evidence

### Merge Conflict Hotspots
1. Only one manual merge conflict occurred during Phase 3 integration:
   - `src/features/admin/new-links/admin-new-links-card.tsx`
2. Conflict cause:
   - Lane B changed card hierarchy and call-to-action clarity.
   - Lane C changed the same component for mobile density.
3. Conflict outcome:
   - both intents were preserved in integration by combining clearer action hierarchy with denser mobile layout.

### Test Churn and Ownership Overlap
1. No existing test files required parallel edits during the three lanes.
2. Lane evidence was captured through targeted E2E runs and lane-specific UX capture plans:
   - `scripts/ux-capture-lane-a-onboarding.json`
   - `scripts/ux-capture-lane-b-admin.json`
   - `scripts/ux-capture-lane-c-responsive.template.json`
3. This indicates low test churn for the current three-lane shape.

### Remaining Coupling
1. `src/App.tsx` remains a real shared surface for:
   - admin table composition
   - preview dialog handling
   - route-level theme scope logic
2. `src/styles.css` remains a shared surface for global utilities and tokens.
3. The extracted feature modules absorbed most lane-specific UX work well enough that only Lane B needed `src/App.tsx` and `src/styles.css`.

## Decision
`defer`

## Rationale
1. The current feature extraction is sufficient for three parallel UX lanes.
2. Integration friction stayed low:
   - one manual component-level conflict
   - no cascading conflicts across `src/App.tsx`
   - no test-suite rewrite pressure
3. A larger refactor now would spend effort ahead of demonstrated need.
4. The remaining coupling is visible but contained. It is not yet blocking parallel delivery at the three-lane level.

## Consequences
1. Keep the current feature-module layout.
2. Do not start a broad frontend re-architecture before the next requirement actually demands it.
3. Track the following files as escalation triggers:
   - `src/App.tsx`
   - `src/styles.css`
   - `src/features/admin/new-links/admin-new-links-card.tsx`

## Trigger for a Larger Refactor
Propose a larger refactor before the next UX wave if any of the following happens:
1. more than one lane needs to edit `src/App.tsx` in the same cycle,
2. more than one lane needs token or utility changes in `src/styles.css`,
3. the same feature component becomes a repeat merge hotspot across two consecutive cycles,
4. E2E maintenance starts requiring repeated multi-lane edits to the same test file.

## Scoped Refactor Proposal if Triggered Later
1. Extract admin table rendering and table-adjacent actions from `src/App.tsx` into `src/features/admin/probe-table/*`.
2. Separate admin theme scope logic from page composition into a route-level theme module.
3. Promote repeated admin surface styling into named utilities/components before adding a fourth concurrent UX lane.

## References
1. `docs/plans/2026-03-10-ux-multi-agent-runbook.md`
2. `docs/plans/2026-03-10-ux-parallelization-and-improvements-plan.md`
3. `docs/requirements/07-m1-agent-execution-contract.md`
4. `docs/requirements/14-frontend-styling-policy.md`
