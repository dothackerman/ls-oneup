# Decision Record: M1 Token-Link And Submission Security

## Status

Accepted

## Date

2026-03-03

## Context

M1 uses one-time probe links shared via QR code and URL token.
Security requirements:

1. Token must be hard to guess.
2. Token must not be stored in plain text.
3. Link must be one-time and time-bounded.
4. Submit race conditions must not allow double acceptance.
5. Submitted probe details and uploaded image objects must not remain plaintext in application-managed storage.

## Decision

1. Token generation:
   - use cryptographically secure random bytes (minimum 32 bytes entropy).
   - encode token as URL-safe string.
2. Storage:
   - store only `token_hash` in D1.
   - do not store raw token after creation response is returned.
3. Hashing:
   - use HMAC-SHA-256 with server-side secrets to derive `token_hash`.
   - store `token_hash` in a versioned format that includes the active key identifier.
   - accept legacy hash formats only for backward compatibility while pre-rotation links remain valid.
   - keep production secrets in Cloudflare secret management and local development secrets in gitignored `.dev.vars`, never in committed source files.
4. Validation:
   - resolve incoming token by recomputing HMAC hashes for the active and legacy key ring.
   - compare candidate hashes without short-circuit string equality in application code.
   - enforce acceptance via one conditional write:
     - matching hash
     - not expired
     - not yet submitted
5. Rotation:
   - model token HMAC keys and submission encryption keys as current-plus-legacy key rings so secrets can rotate without immediately invalidating still-live links or encrypted payloads.
   - remove legacy keys only after the longest issued link lifetime has elapsed or protected records have been re-encrypted.
6. Inventory and policy:
   - maintain a repository-level cryptographic inventory in `docs/security/crypto-inventory.json`.
   - validate inventory coverage with `npm run crypto:run` before release-oriented changes.
   - separate gate-validated live crypto evidence from non-gated provenance so deleted or renamed migration files do not break current control evidence.
   - treat `migrations/*.sql` files as provenance only, never as gate-validated live crypto evidence.
   - keep key lifecycle, fail-secure behavior, and crypto-agility rules in `docs/security/crypto-policy.md`.
7. Submission storage:
   - encrypt submitted crop, vitality, moisture, GPS, and image-key data before writing to D1.
   - encrypt uploaded image bytes before writing them to R2.
   - keep non-sensitive upload metadata (`image_mime`, `image_bytes`, `image_uploaded_at`) in plaintext for validation and delivery.
   - treat browser-side metadata stripping as best-effort only; the server remains the authoritative upload validator.
   - reject sensitive or suspicious embedded image metadata markers before storage, specifically JPEG APP1/APP13/comment markers and PNG textual/exif chunks.
   - tolerate JPEG `APP2` markers for now to avoid false positives on normal camera uploads; this is an explicit temporary trade-off, not a claim that all JPEG metadata is currently scrubbed or rejected.
   - preserve legacy plaintext rows and legacy raw R2 image objects for backward-compatible reads while new submissions write encrypted storage only.
8. Logging:
   - never log raw tokens.
   - log only probe ID and non-sensitive state (`accepted`, `expired`, `already_used`, `invalid`).
9. Orphan object handling:
   - if R2 upload succeeds but submit write loses race/fails, run best-effort delete and log result.
10. Sensitive response caching:

- admin API responses and admin-served probe images must return anti-caching headers (`cache-control: no-store`, `pragma: no-cache`, `expires: 0`).
- token-bound probe API responses must also return anti-caching headers so probe state and submission outcomes are not stored by browsers or intermediaries.
- admin responses should vary on `Cf-Access-Authenticated-User-Email` so access-scoped content is not reused across identities if caching is reintroduced upstream.

11. Operational evidence:

- keep logging/error-handling rules in `docs/security/logging-and-error-handling.md`.
- keep risky component and dangerous-functionality notes in `docs/security/dependency-risk-register.md`.

## Consequences

Positive:

1. No reusable plaintext token at rest in DB.
2. Strong resistance to token guessing.
3. One-time semantics robust against concurrent submits.
4. Crypto ownership and rotation evidence are reviewable from repository artifacts instead of ad hoc memory.
5. Newly submitted probe details are no longer stored as plaintext business data in D1.
6. Newly uploaded probe images are no longer stored as plaintext object bodies in R2.
7. Sensitive response handling now depends on explicit anti-caching headers rather than assuming browsers or intermediaries will behave safely by default.
8. Logging and risky-component evidence now lives in dedicated docs instead of being scattered across runbooks and plan notes.

Trade-offs:

1. Token cannot be recovered from DB; admin must regenerate only in later milestone if needed.
2. HMAC and submission-key ring management become required operational setup.
3. Rotation requires retaining legacy secrets until outstanding token lifetimes have elapsed or protected records have been re-encrypted.
4. Admin read paths now depend on successful payload and image decryption plus key availability.
5. Anti-caching headers reduce browser convenience features such as response reuse and make debugging via intermediary caches less pleasant, which is the correct kind of inconvenience here.
6. Operational posture is more reviewable, but it also creates doc drift risk if future slices change runtime behavior without updating the dedicated evidence docs.
7. The image-metadata posture is intentionally narrower than blanket rejection: it targets markers currently associated with privacy-sensitive metadata while allowing JPEG `APP2` segments until the false-positive rate is better understood.
8. Migration filenames remain useful audit breadcrumbs, but they are no longer allowed to masquerade as live crypto evidence in CI gates.

## Alternatives Considered

1. Plain token stored in DB:
   - rejected due to leakage risk.
2. Unsalted hash:
   - weaker posture than keyed HMAC if DB is leaked.
3. Stateless signed token without DB row:
   - rejected because M1 requires strict one-time submit state and admin tracking.

## Verification Requirements

1. Integration test for first-submit-wins race.
2. Integration test for expired token rejection.
3. Integration test for invalid token rejection.
4. Verify logs contain no raw token values.
5. Integration test for anti-caching headers on admin and token-bound responses.
