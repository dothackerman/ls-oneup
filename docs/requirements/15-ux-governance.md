# UX Governance (Operator-Grade)

## Purpose
Define project UX principles that agents must enforce for UX-affecting changes.

## Principles
1. One focus per onboarding step/screen.
2. Onboarding should explain in-context; avoid separate conceptual UI layers.
3. Remove avoidable visual noise (extra banners/labels/helper blocks).
4. Prioritize clear CTA hierarchy over feature exposition.
5. Keep overlay/highlight geometry visually coherent.
6. Use realistic preview states that are safe and non-persistent.
7. Split complex actions into sequential states when needed.
8. Prefer shared rendering paths to prevent preview/production drift.
9. Keyboard-driven inline edits must teach their controls in context while the edit state is active.

## UX Validation Contract
1. Run QA loop (`format`, `lint`, `typecheck`, `integration`, `e2e`).
2. For UX work, include screenshot-based evidence via `ux:capture` when runnable.
3. If a visual issue cannot be explained from screenshots alone, use the repo-local Playwright CLI wrapper for clean-session reproduction and DOM/console/network inspection.
4. The Playwright CLI wrapper is for local investigation only; it does not replace `test:e2e`, `ux:capture`, or real manual UX judgment.
5. Document any intentional UX tradeoff in the same change.
