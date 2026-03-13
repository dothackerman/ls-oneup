# Crypto Policy

## Scope
This policy covers all application-managed cryptographic operations in `ls-oneup`.
The current runtime scope is limited to one-time probe-token protection and the platform CSPRNG used to generate those tokens.

## Key Management
1. Runtime secrets must come from Cloudflare secret management in deployed environments and from gitignored `.dev.vars` in local development.
2. Token HMAC material is supplied as `TOKEN_HMAC_KEYS_JSON` with one `current` key and optional `legacy` keys.
3. Key identifiers must be unique, stable, and non-secret.
4. Raw key material must never be committed to the repository, logged, or copied into generated reports.
5. Rotation uses additive rollout:
   - introduce a new `current` key,
   - move the previous `current` key into `legacy`,
   - keep legacy keys for at least the maximum token lifetime,
   - remove retired keys only after outstanding links can no longer be valid.

## Inventory And Discovery
1. The maintained crypto inventory lives in `docs/security/crypto-inventory.json`.
2. `npm run crypto:inventory` is the recurring discovery check. It scans runtime and integration-test code for approved Web Crypto markers, compares observed call sites to the inventory, writes `docs/security/crypto-discovery.json`, and fails on undocumented drift.
3. Any pull request that adds a new cryptographic primitive, key source, or call site must update the inventory in the same change.

## Approved Runtime Usage
1. Token hashing uses HMAC-SHA-256 via Web Crypto.
2. Token generation uses `crypto.getRandomValues` with 32 random bytes per token.
3. No password-derived keys are in scope for the current milestone.

## Crypto Agility
1. Stored token hashes are versioned so readers can distinguish current and legacy formats.
2. Algorithm and key changes must preserve backward-compatible verification until active tokens expire.
3. New primitives are not introduced ad hoc; they must be documented in the inventory with purpose, code references, and migration notes before merge.

## Secure Failure
1. Missing or malformed crypto configuration must fail closed.
2. Client-facing responses must stay generic and must not expose raw tokens, key identifiers, or stack traces.
3. Operational logs may record the failure class and affected probe identifier, but never secret material.

## Constant-Time Handling
1. Token-hash comparisons must not rely on short-circuit string equality.
2. Any future secret comparison logic must use the same non-short-circuit approach or an equivalent constant-time primitive.

## Randomness Expectations
1. The application relies on the platform Web Crypto CSPRNG rather than a custom entropy pool.
2. Token issuance keeps randomness centralized in `worker/security.ts` so demand, size, and fallback behavior remain reviewable in one place.
3. Load-related validation is provided by integration coverage and inventory review rather than a separate bespoke RNG implementation. Clever entropy daemons are how teams accidentally become folklore collectors.
