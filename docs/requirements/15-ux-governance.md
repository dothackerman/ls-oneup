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

## UX Validation Contract
1. Run QA loop (`format`, `lint`, `typecheck`, `integration`, `e2e`).
2. For UX work, include screenshot-based evidence via `ux:capture` when runnable.
3. Document any intentional UX tradeoff in the same change.
