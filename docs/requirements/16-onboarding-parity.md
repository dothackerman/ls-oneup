# Onboarding Parity Policy

## Purpose
Ensure onboarding remains a thin layer over real UI behavior and does not diverge.

## Rules
1. Prefer real UI components with state adapters over duplicate preview markup.
2. Preview rows/cards must mirror production layout and control placement.
3. Preview interactions must remain safe (no accidental persistence side effects).
4. If preview uses mock data, values should look realistic but non-identifying.
5. Avoid extra explanatory chrome when visual state already communicates behavior.

## Required Checks
1. Verify step-by-step onboarding states map to real UI states.
2. Verify dialog placement does not hide target when avoidable.
3. Verify preview-only artifacts are scoped to the relevant onboarding step.
