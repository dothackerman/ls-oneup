# UX Improvements and Parallelization Plan (2026-03-10)

## Purpose
Persist the complete UX change set and define the minimum frontend refactor needed so at least three implementation agents can work in parallel with low merge friction.

## Scope
This plan covers:
1. Documented UX issues from the full light/dark desktop/mobile sweep.
2. Small refactors to unlock parallel lanes (minimum 3).
3. Ordered implementation and verification strategy.
4. Post-implementation architecture reassessment for potential larger refactor.

This plan does not include M2/M3 features.

## Inputs and Evidence
Visual sweep artifacts:
1. `test-results/ux/2026-03-10T19-04-28.502Z/`
2. Key onboarding evidence:
   - `04-admin-onboarding-step4-light-desktop.png`
   - `05-admin-onboarding-step5-light-desktop.png`
   - `07-admin-onboarding-step7-light-desktop.png`
3. Key admin light/dark evidence:
   - `09-admin-generated-light-desktop.png`
   - `10-admin-generated-dark-desktop.png`
   - `11-admin-generated-dark-mobile.png`
   - `12-admin-generated-light-mobile.png`
   - `17-admin-dark-scope-check-desktop.png`
4. Key farmer evidence:
   - `14-farmer-default-light-desktop.png`
   - `16-farmer-partial-light-mobile.png`
   - `18-farmer-light-while-admin-dark-desktop.png`

## Confirmed UX Issues
1. Onboarding missing-target step appears visually broken:
   - Step "Links und QR-Codes" can have no highlight target before data exists.
   - Result is heavy blur/dim without clear focal anchor.
2. Onboarding highlight coverage is inconsistent:
   - Some steps highlight real sections.
   - Missing-data steps do not highlight a concrete section.
3. Dark-mode admin table readability is weak:
   - Row separation and text hierarchy degrade scanability in dark mode.
4. Generated-link cards have weak next-action affordance:
   - Raw URL is visually heavy; "what to do next" is not explicit enough.
5. Mobile admin QR card density is high:
   - QR dominates viewport and pushes key actions/context lower.
6. Farmer file input has mixed locale:
   - Browser-native "Choose File / No file chosen" appears in otherwise German UI.

## Constraint and Tradeoff Notes
1. Constraint:
   - Keep refactor minimal and requirement-linked (no speculative redesign).
2. Constraint:
   - Preserve admin-only dark mode scope (`/admin` dark preference must not spill to `/p/:token`).
3. Tradeoff:
   - Better contrast/affordances may reduce some visual subtlety, but improves speed and error resistance.
4. Failure mode to avoid:
   - Parallel edits concentrated in `src/App.tsx` causing repeated merge conflicts and regressions.

## Current Frontend Parallelization Assessment
1. Current structure is functional but not parallel-optimal.
2. `src/App.tsx` currently centralizes most UX concerns (admin onboarding, admin cards/table, farmer form, theme scope).
3. Without a small prep refactor, parallel agent work is possible but conflict-prone and inefficient.

## Phase Plan

## Execution Status
1. Phase 1:
   - completed
   - this plan persisted with evidence, ownership, and verification protocol
2. Phase 2:
   - completed (behavior-preserving extraction)
   - implemented modules:
   - `src/features/admin/onboarding/admin-onboarding-steps.ts`
   - `src/features/admin/onboarding/use-admin-onboarding.ts`
   - `src/features/admin/onboarding/admin-onboarding-dialog.tsx`
   - `src/features/admin/new-links/admin-new-links-card.tsx`
   - `src/features/farmer/form/farmer-submission-form.tsx`
   - `src/App.tsx` rewired to consume extracted modules
3. Phase 3:
   - pending (parallel UX implementation lanes)
4. Phase 4:
   - pending (post-implementation architecture reassessment)

### Phase 1: Persist UX Change Set and Execution Model
Deliverable:
1. This document in `docs/plans/`.

Acceptance:
1. UX issues, constraints, and sequence are explicit.
2. Write ownership and verification protocol are defined.

### Phase 2: Minimal Refactor to Enable 3+ Parallel Lanes
Goal:
1. Create disjoint write areas while preserving behavior.

Refactor slices:
1. Extract admin onboarding flow into a dedicated feature module.
   - Path: `src/features/admin/onboarding/*`
   - Include step metadata, target detection, modal controls, and placeholder policy.
2. Extract "Neue Links und QR-Codes" section into a dedicated component.
   - Path: `src/features/admin/new-links/*`
3. Extract farmer form input cluster (especially file input UI) into a dedicated component.
   - Path: `src/features/farmer/form/*`
4. Keep global theme tokens in `src/styles.css`; no per-feature token duplication.

Refactor constraints:
1. Behavior-preserving; no UX changes beyond structural extraction.
2. Keep route-level theme scope logic unchanged.
3. Keep selectors needed for onboarding/e2e compatibility unless intentionally updated with test changes.

### Phase 3: Implement UX Improvements in Parallel
After Phase 2, run at least 3 implementation lanes:

Lane A (Onboarding UX):
1. Fix missing-target blur state.
2. Add onboarding-only simulated preview sections for missing targets.
3. Ensure each onboarding step has a highlightable target.

Lane B (Admin Readability + Card UX):
1. Improve dark table readability (rows/text/separators).
2. Improve generated-card action hierarchy (`Formular öffnen`, copy/download clarity).
3. Keep dark/light visual consistency.

Lane C (Responsive + Farmer Locale):
1. Improve mobile density for admin QR cards.
2. Replace native-looking file picker presentation with localized accessible wrapper.

Lane D (Optional/Test lane, can run in parallel):
1. Update and stabilize e2e tests by feature area.
2. Maintain UX capture plans for each changed state.

### Phase 4: Post-Implementation Architecture Check
Goal:
1. Decide if a larger refactor is justified to support more than 3-4 parallel lanes.

Check criteria:
1. Merge conflict frequency during Phase 3.
2. Test churn caused by ownership overlap.
3. Time lost to reintegration vs feature implementation.
4. Remaining high-coupling hotspots in frontend modules.

Decision rule:
1. If parallel work still causes repeated cross-lane conflicts in shared files, create a larger feature-module refactor proposal.
2. If conflict/churn remains low and lanes are stable, defer larger refactor.

## Agent Lane Ownership (Required)
Each lane owns explicit files/modules and should avoid cross-lane edits unless coordinated.

1. Lane A ownership:
   - `src/features/admin/onboarding/*`
   - `src/shared/components/patterns/spotlight-overlay.tsx` (only if needed)
2. Lane B ownership:
   - `src/features/admin/new-links/*`
   - dark-table style classes in admin table module
   - `src/styles.css` token edits (coordinate with Lane C if needed)
3. Lane C ownership:
   - `src/features/farmer/form/*`
   - admin mobile card layout module
4. Lane D ownership:
   - `tests/e2e/*`
   - `scripts/ux-capture*.json` plan files used for validation

Coordination rule:
1. `src/styles.css` is shared and must use explicit lock-step sequencing if two lanes need token changes.

## Verification Protocol (Per Slice)
For each slice/lane:
1. Requirement trace:
   - map change to specific UX issue(s) in this document.
2. Functional checks:
   - `npm run format`
   - `npm run lint`
   - targeted `npm run test:e2e -- -g "<relevant tests>"`
3. UX checks:
   - `npm run ux:capture -- --plan <lane-plan.json>`
   - inspect desktop + mobile for viewport-sensitive changes
   - inspect light + dark for admin-facing changes
4. Runtime checks:
   - verify admin dark mode scope remains limited to `/admin` and not `/p/:token`.

Do not commit any slice unless the above is green.

## Commit Strategy
1. One commit per requirement-linked slice.
2. Merge order recommendation:
   - Phase 2 refactor first (small, behavior-preserving).
   - Then Phase 3 lanes.
   - Then integration stabilization/tests.
3. Do not squash unrelated lanes into one commit.

## Risks and Mitigations
1. Risk:
   - Refactor introduces hidden behavior changes.
   Mitigation:
   - Keep Phase 2 strictly extraction-only with same selectors and tests.
2. Risk:
   - Onboarding placeholders confuse users as real data.
   Mitigation:
   - Explicit "Vorschau" labeling and non-interactive UI.
3. Risk:
   - Dark-mode token changes regress other surfaces.
   Mitigation:
   - capture and inspect both admin default and populated states in light/dark.

## References
1. `AGENTS.md`
2. `docs/requirements/07-m1-agent-execution-contract.md`
3. `docs/requirements/14-frontend-styling-policy.md`
4. `docs/requirements/11-m1-test-traceability-matrix.md`
