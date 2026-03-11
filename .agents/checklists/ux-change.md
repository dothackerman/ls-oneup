# UX Change Checklist

## When To Use
Use for UI/UX/onboarding/visual behavior changes.

## Must Pass
1. One primary action/focus per step/screen.
2. Onboarding does not obscure explained target where avoidable.
3. Preview states are visually real and operationally safe (no persistence side effects).
4. No avoidable visual clutter (extra banners/labels/duplicate helper copy).
5. Shared rendering path used where possible to reduce drift.

## Evidence Required
1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:integration`
5. `npm run test:e2e`
6. `npm run ux:capture -- --plan <plan-file>` (when runnable)
7. `npm run pw:cli -- <command>` when a clean browser session, DOM inspection, or console/network evidence is needed to explain a visual bug

## Failure Modes
1. Onboarding state diverges from production state.
2. Overlay/highlight geometry mismatch.
3. Mock state misleads user about real persistence.

## Tool Choice
1. Prefer `npm run ux:capture -- --plan <plan-file>` for repeatable screenshot plans and known visual checks.
2. Prefer `npm run pw:cli -- <command>` for iterative debugging, stateful reproduction, DOM inspection, and console/network evidence.
3. Do not treat Playwright CLI as a CI gate or a replacement for the existing Playwright test suite.
