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
| Submit blocked without mandatory fields, GPS, one image | `INT-SUBMIT-001`    | `E2E-FARM-001`  | implemented                            |
| Submitted probes visible with status `eingereicht`      | `INT-STATUS-001`    | `E2E-ADMIN-003` | partial (INT implemented, E2E pending) |
| Unused links become `abgelaufen` after TTL              | `INT-LINK-002`      | `E2E-FARM-002`  | partial (INT implemented, E2E pending) |
| Used link cannot be submitted again                     | `INT-SUBMIT-002`    | `E2E-FARM-003`  | implemented                            |
| No internet prevents load/submit (M1 online-only)       | `INT-NET-001`       | `E2E-FARM-004`  | partial (E2E implemented, INT pending) |
| Backend rejects non-JPEG/PNG and >2 MB                  | `INT-UPLOAD-001`    | `E2E-FARM-005`  | partial (INT implemented, E2E pending) |
| Admin can view uploaded image via D1->R2 reference      | `INT-ADMIN-002`     | `E2E-ADMIN-004` | partial (INT implemented, E2E pending) |

## Additional Risk-Driven Tests

1. First-submit-wins concurrency race:
   - `INT-SUBMIT-003` (parallel submit requests, exactly one accepted) - implemented
2. Orphan cleanup path:
   - `INT-UPLOAD-002` (R2 write succeeds, conditional D1 submit fails -> delete attempted and logged) - implemented
3. Admin crop override timestamp:
   - `INT-ADMIN-003` implemented, `E2E-ADMIN-005` pending

## Minimum Test Inventory for M1 Sign-off

1. Integration tests: all `INT-*` above green.
2. E2E tests: all `E2E-*` above green.
3. Evidence attached to M1 completion PR:
   - command outputs from `ci:local`
   - concise mapping of passing tests to acceptance criteria.
