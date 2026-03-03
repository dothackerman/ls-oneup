# Decision Record: M1 Token-Link Security

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

## Decision
1. Token generation:
   - use cryptographically secure random bytes (minimum 32 bytes entropy).
   - encode token as URL-safe string.
2. Storage:
   - store only `token_hash` in D1.
   - do not store raw token after creation response is returned.
3. Hashing:
   - use HMAC-SHA-256 with server-side secret (`token_pepper`) to derive `token_hash`.
   - keep secret in Cloudflare secret management, never in source code.
4. Validation:
   - resolve incoming token by recomputing HMAC hash.
   - enforce acceptance via one conditional write:
     - matching hash
     - not expired
     - not yet submitted
5. Logging:
   - never log raw tokens.
   - log only probe ID and non-sensitive state (`accepted`, `expired`, `already_used`, `invalid`).
6. Orphan object handling:
   - if R2 upload succeeds but submit write loses race/fails, run best-effort delete and log result.

## Consequences
Positive:
1. No reusable plaintext token at rest in DB.
2. Strong resistance to token guessing.
3. One-time semantics robust against concurrent submits.

Trade-offs:
1. Token cannot be recovered from DB; admin must regenerate only in later milestone if needed.
2. HMAC secret management becomes required operational setup.

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
