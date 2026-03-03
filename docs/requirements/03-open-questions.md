# Open Questions and Clarifications

## Milestone 1 Technical Status
1. No technical open questions remain for M1.
2. Stack for M1 is frozen on primary path from `06-application-tech-stack-memo.md`.
3. Integration and E2E tests must run against local Workers runtime semantics before merge.

## Deferred to Milestone 2
1. Will revoke/regenerate links be included in M2 initial release or moved further?
2. If revoke/regenerate is implemented, what exact UX flow is preferred in admin UI?
3. How strictly should whole-plant image quality (A3 paper/scale visibility) be validated automatically vs manually?

## Deferred to Milestone 3
1. Which BBCH model/provider will be used?
2. What confidence threshold policy should control model-prefill behavior?
3. Which model metadata must be stored (for example confidence, model version, inference timestamp)?

## Data Governance
1. Legal and data-governance items are explicitly deferred until M1 implementation is running.
2. Open items to resolve in that phase:
   - legal basis/consent wording for GPS and image collection
   - model-training reuse policy (default vs opt-in)
   - retention and deletion policy for images and probe metadata
