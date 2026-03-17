# 001: Remove D1 submit-state triggers

Date: 2026-03-17

## Problem
Cloudflare D1 migrations are executed by a runner that splits SQL statements on semicolons. `CREATE TRIGGER ... BEGIN ... END` definitions contain internal semicolons, so trigger migrations are not reliably applied by D1's migration runner.

## Decision
Remove submit-state validation triggers from migrations and rely on application-layer validation only.

Validation is already enforced before any write by:
- Zod schemas (`farmerSubmitFieldsSchema`)
- Worker request guards (`parseSubmitRequest` / image guards)
- Submission payload validation in encryption flow (`assertSubmissionPayload`)

## Validation surface replacing trigger enforcement
The integration suite now covers trigger-equivalent constraints at the API boundary:
- Missing `crop_name` (when no `submission_ciphertext`) -> rejected with 4xx.
- Invalid `plant_vitality` -> rejected with 4xx.
- Invalid `soil_moisture` -> rejected with 4xx.
- `gps_lat` outside `[-90, 90]` -> rejected with 4xx.
- `gps_lon` outside `[-180, 180]` -> rejected with 4xx.
- Missing `gps_captured_at` -> rejected with 4xx.
- Missing `image` file (so both `image_key` and `image_uploaded_at` cannot be produced) -> rejected with 4xx.
- Invalid `image_mime` -> rejected with 4xx.
- `image_bytes` out of range (file too large) -> rejected with 4xx.

## Consequences
- D1 migration execution is deterministic in local/prod runners.
- Defense-in-depth shifts fully to API-layer validation and integration coverage.
- Direct DB writes bypassing Worker validation are no longer a supported safety boundary.
