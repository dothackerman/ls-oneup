# Open Questions and Clarifications

## Milestone 1 Technical Status

1. No technical open questions remain for M1.
2. Stack for M1 is frozen on primary path from `06-application-tech-stack-memo.md`.
3. Integration and E2E tests must run against local Workers runtime semantics before merge.

## Deferred to Milestone 2

1. Will revoke/regenerate links be included in M2 initial release or moved further?
2. If revoke/regenerate is implemented, what exact UX flow is preferred in admin UI?
3. How strictly should whole-plant image quality (A3 paper/scale visibility) be validated automatically vs manually?
4. Should failed farmer uploads offer a first-class support fallback instead of plain retry/support copy?
   - current hotfix scope keeps only generic retry guidance; no support ingestion flow is part of the production fix
   - if implemented later, prefer a backend support incident flow over `mailto:`
   - `mailto:` is not sufficient for reliable attachment handling and should not be treated as a submission transport
   - minimum v1 capability:
     - farmer can report a failed upload from the same screen
     - system stores a support incident with reference id, failure class, timestamp, probe reference, and browser/device diagnostics
     - farmer sees a confirmation plus the support reference id
   - optional v2 capability:
     - farmer can explicitly consent to send the selected image for diagnosis
     - support flow stores the image separately from the main submission path with explicit retention/access policy
   - explicit non-goals unless separately approved:
     - auto-emailing the original image via `mailto:`
     - silently attaching GPS/token data to an email draft
     - treating support fallback as a second submission channel
   - open product decisions:
     - diagnostics-only vs optional image upload
     - whether GPS/crop/soil/vitality may be included in support payloads
     - retention, access control, and deletion policy for support incidents
     - whether support may only diagnose or may also recover/resubmit a probe on behalf of the farmer

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
