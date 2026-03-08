# M1 Test Traceability Matrix

## Purpose

Map each M1 acceptance criterion to automated tests.

## Runtime Policy

1. Integration and E2E tests must run with local Workers runtime semantics.
2. `ci:local` must execute and fail on any test failure.

## Acceptance Criteria Coverage

| M1 Acceptance Criterion (`02-milestones.md`)            | Integration Test ID | E2E Test ID     | Status                                 |
| ------------------------------------------------------- | ------------------- | --------------- | -------------------------------------- |
| Admin can create probes/links for one order in one flow | `INT-ADMIN-001`     | `E2E-ADMIN-001` | implemented                            |
| Each probe has exactly one active link in M1            | `INT-LINK-001`      | `E2E-ADMIN-002` | implemented                            |
| Submit blocked without mandatory fields, GPS, one image | `INT-SUBMIT-001`, `INT-DATA-001`, `INT-DATA-002` | `E2E-FARM-001`, `E2E-FARM-006`  | implemented                            |
| Submitted probes visible with status `eingereicht`      | `INT-STATUS-001`    | `E2E-ADMIN-003` | implemented (inkl. Farmer-Felder in Admin-Tabelle) |
| Unused links become `abgelaufen` after TTL              | `INT-LINK-002`      | `E2E-FARM-002`  | implemented                            |
| Used link cannot be submitted again                     | `INT-SUBMIT-002`    | `E2E-FARM-003`  | implemented                            |
| No internet prevents load/submit (M1 online-only)       | `INT-NET-001`       | `E2E-FARM-004`  | implemented via E2E (`INT-NET-001` is N/A for Worker integration) |
| Backend rejects non-JPEG/PNG and >2 MB                  | `INT-UPLOAD-001`    | `E2E-FARM-005`  | implemented                            |
| Admin can view uploaded image via D1->R2 reference      | `INT-ADMIN-002`     | `E2E-ADMIN-004` | implemented (direkter API-Bildpfad im Modal, ohne Blob-URL) |

## Additional Risk-Driven Tests

1. First-submit-wins concurrency race:
   - `INT-SUBMIT-003` (parallel submit requests, exactly one accepted) - implemented
2. Orphan cleanup path:
   - `INT-UPLOAD-002` (R2 write succeeds, conditional D1 submit fails -> delete attempted and logged) - implemented
3. Admin crop override timestamp and submitted-only guard:
   - `INT-ADMIN-003` and `E2E-ADMIN-005` implemented
4. Lazy image preview caching:
   - `E2E-ADMIN-004` verifies modal reopen without second image fetch - implemented
5. Responsive admin table behavior:
   - `E2E-ADMIN-006` verifies pagination (`20` rows per page)
   - `E2E-ADMIN-007` verifies sticky/right-side image action visibility on narrow viewport
6. GPS capture progress feedback:
   - `E2E-FARM-007` verifies loading spinner + disabled button while GPS capture is in progress
7. Admin onboarding first-load behavior:
   - `E2E-ADMIN-008` verifies first-load tour display, `Überspringen` persistence, and `?onboarding=force` reopen behavior

## Minimum Test Inventory for M1 Sign-off

1. Integration tests: all `INT-*` above green.
2. E2E tests: all `E2E-*` above green.
3. Evidence attached to M1 completion PR:
   - command outputs from `ci:local`
   - concise mapping of passing tests to acceptance criteria.
