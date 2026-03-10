# Frontend Styling Policy

This document defines the styling rules for frontend work in `ls-oneup` so UX changes stay consistent, reviewable, and low-friction across agents and sessions.

## Purpose
1. Keep the UI layer predictable.
2. Reduce styling drift between sessions.
3. Preserve a clean boundary between shadcn base components, app-level composition, and global theme configuration.

## Source Layers
1. `components.json`
   - defines the shadcn registry baseline and points to the canonical Tailwind CSS bridge at `src/styles.css`
2. `src/shared/components/ui/`
   - contains shadcn-derived or generic reusable primitives
   - these are the base building blocks
3. app-level screens and flows
   - compose the base primitives using Tailwind utility classes
4. `src/styles.css`
   - contains design tokens, global theme variables, base rules, and explicitly approved global utilities

## Required Rules
1. Prefer existing shadcn base components from `src/shared/components/ui/` before introducing new primitives.
2. Do not put app-specific product behavior into `src/shared/components/ui/`.
3. App-specific composites belong in a non-`ui` layer such as `src/shared/components/patterns/` or a feature-specific component folder.
4. Prefer Tailwind utility classes in application code.
5. Do not use static inline styles for visual presentation when Tailwind utilities or existing tokens can express the same result.
6. Do not add one-off app CSS rules when a reusable utility or token should exist instead.

## Allowed Exceptions
Inline styles are allowed only when values are inherently runtime-calculated or browser-integrated and cannot be represented cleanly with static utilities.

Examples:
1. measured overlay geometry for spotlight/highlight positioning
2. browser integration such as `color-scheme`
3. runtime-computed CSS variables

These exceptions must remain narrow and local.

## Global Theme Policy
1. Global colors, radii, and typography tokens live in `src/styles.css`.
2. App-shell background treatments such as the current light/dark radial gradients are canonical global theme decisions, not accidental overrides.
3. Theme token changes should be centralized in `src/styles.css`, not redefined ad hoc in component files.

## Utility Policy
1. Repeated visual patterns should be extracted into named utilities or reusable components instead of duplicated arbitrary values.
2. Arbitrary Tailwind values are acceptable for isolated cases during exploration, but repeated usage should be promoted into a named pattern.

## Review Checklist
Before merging frontend styling work, confirm:
1. Does this belong in a base `ui` primitive or in an app-specific pattern/component?
2. Can this be expressed with existing Tailwind utilities and tokens?
3. If inline style is used, is it truly runtime-calculated or browser-integrated?
4. If an arbitrary value is repeated, should it become a named utility or token?

## UX Validation
1. Functional automated tests stay functional; they do not prove UX validity.
2. UX-affecting changes require screenshot-based visual inspection before commit/push.
3. Use the existing Playwright setup for that inspection instead of adding a separate browser tool by default.
4. The project provides `npm run ux:capture -- --plan <file>` for repeatable screenshot capture.
5. Store temporary visual artifacts under `test-results/ux/` unless a task explicitly needs a different location.
6. For viewport-sensitive UX, inspect at least one desktop-sized capture and one narrow/mobile capture when relevant.
7. If the requirement is subjective or design-sensitive, visual approval is required in addition to green functional checks.

### Capture Plan Format
`ux:capture` reads a JSON plan file with:
1. `browser`
   - optional, defaults to `chromium`
2. `viewport`
   - optional `width` and `height`
3. `steps`
   - ordered steps, each optionally containing:
   - `url`
   - `screenshot`
   - `actions`

Supported actions:
1. `goto`
2. `clickRole`
3. `waitForTimeout`
4. `screenshot`

See `scripts/ux-capture.example.json` for a working example.
