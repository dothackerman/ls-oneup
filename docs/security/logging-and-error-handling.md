# Logging And Error Handling

## Purpose
Define one authoritative operating contract for security-relevant logs, generic client-facing errors, and the current M1 failure-handling posture.

## Current Runtime Events
The Worker currently emits these structured log events:

1. `probe_create_failed`
2. `crypto_security_error`
3. `r2_upload_failed`
4. `orphan_cleanup_ok`
5. `orphan_cleanup_failed`
6. `submit_accepted`

These events are intentionally narrow. That restraint is a feature, not an omission wearing a fake mustache.

## Logging Rules
1. Never log raw probe tokens.
2. Never log decrypted submission payloads, uploaded image bytes, key material, or full stack traces to client-visible responses.
3. Prefer stable event names plus small structured fields over ad hoc prose strings.
4. Log probe identifiers and coarse state transitions when needed for operations (`accepted`, cleanup outcome, configuration failure class).
5. Treat missing or malformed cryptographic configuration as an operational error, not a validation detail to echo back to users.

## Client-Facing Error Policy
1. Error responses under `/api/*` use the JSON contract in [09-m1-api-contract.md](../requirements/09-m1-api-contract.md).
2. Cryptographic or storage failures return generic `503` errors and do not disclose key IDs, token material, ciphertext contents, or internal stack traces.
3. Validation failures may explain the violated user constraint, but must stay bounded to the request contract.
4. Token-state failures may disclose only the coarse outcome required by product behavior:
   - `TOKEN_NOT_FOUND`
   - `TOKEN_EXPIRED`
   - `TOKEN_ALREADY_USED`

## Operational Expectations
1. Release and smoke-test workflows must verify that admin Access protection is active before relying on admin logs or admin content checks.
2. Post-release review should inspect logs for repeated `crypto_security_error`, `r2_upload_failed`, and `orphan_cleanup_failed` events.
3. `submit_accepted` confirms successful acceptance without logging submitted field contents.
4. Best-effort orphan cleanup is observable through `orphan_cleanup_ok` and `orphan_cleanup_failed`; the application does not silently swallow that path.

## Failure Handling Boundaries
1. Crypto failures fail closed: the request is rejected rather than falling back to plaintext or partial reads.
2. Storage write failures fail closed: the user sees a generic `503`, and no success is reported.
3. Submit race failures prefer first-submit-wins semantics and emit cleanup logs if the losing write already uploaded to R2.
4. Admin image reads require successful decryption when the stored object is encrypted; failures are blocked rather than bypassed.

## Known Gaps
1. The current milestone has no central log shipping, retention, or alerting automation documented in-repo.
2. Logging coverage is intentionally sparse; if future slices add new security-relevant flows, they must either reuse these rules or extend this document in the same change.
3. Cloudflare deployment-side visibility still depends on platform configuration outside this repository.
