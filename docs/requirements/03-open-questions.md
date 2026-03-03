# Open Questions and Clarifications

## Still Open for Milestone 1
1. Do we keep the fallback stack (`Astro + direct D1 SQL`) as an active contingency, or freeze on primary stack only?
2. Do we enforce MIME validation strictly both client-side and server-side for `image/jpeg` and `image/png` from day one?

## Deferred to Milestone 2
1. Will revoke/regenerate links be included in M2 initial release or moved further?
2. If revoke/regenerate is implemented, what exact UX flow is preferred in admin UI?
3. How strictly should whole-plant image quality (A3 paper/scale visibility) be validated automatically vs manually?

## Deferred to Milestone 3
1. Which BBCH model/provider will be used?
2. What confidence threshold policy should control model-prefill behavior?
3. Which model metadata must be stored (for example confidence, model version, inference timestamp)?

## Data Governance
1. What legal basis/consent wording is required for GPS and image collection?
2. Can images be reused for model training by default, or only with explicit opt-in?
3. What retention and deletion policy applies to uploaded images and probe metadata?
