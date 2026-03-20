# Crypto Policy

## Scope

This policy covers all application-managed cryptographic operations in `ls-oneup`.
The current runtime scope includes one-time probe-token protection, encrypted submission payload storage, encrypted probe-image object storage, and the platform CSPRNG used to support both flows.

## Key Management

1. Runtime secrets must come from Cloudflare secret management in deployed environments and from gitignored `.dev.vars` in local development.
2. Token HMAC material is supplied as `TOKEN_HMAC_KEYS_JSON` with one `current` key and optional `legacy` keys.
3. Submission data encryption material is supplied as `SUBMISSION_DATA_KEYS_JSON` with one `current` key and optional `legacy` keys.
4. Key identifiers must be unique, stable, and non-secret.
5. Raw key material must never be committed to the repository, logged, or copied into generated reports.
6. Rotation uses additive rollout:
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
2. Submission payload and uploaded image-object encryption use AES-256-GCM via Web Crypto.
3. Token generation and AES-GCM IV generation use `crypto.getRandomValues`.
4. No password-derived keys are in scope for the current milestone.

## Crypto Agility

1. Stored token hashes are versioned so readers can distinguish current and legacy formats.
2. Encrypted submission payloads must include an envelope version, algorithm marker, and key identifier.
3. Algorithm and key changes must preserve backward-compatible verification or decryption until active data can be migrated or retired.
4. New primitives are not introduced ad hoc; they must be documented in the inventory with purpose, code references, and migration notes before merge.

## Secure Failure

1. Missing or malformed crypto configuration must fail closed.
2. Client-facing responses must stay generic and must not expose raw tokens, decrypted submission data, key identifiers, or stack traces.
3. Operational logs may record the failure class and affected probe identifier, but never secret material.
4. Submission-payload or encrypted-image decryption failures must block admin reads instead of falling back to silent corruption or partial plaintext reconstruction.
5. Responses that expose token-bound state, decrypted submission data, or admin-served encrypted-object reads must send anti-caching headers (`cache-control: no-store`, `pragma: no-cache`, `expires: 0`) instead of relying on browser defaults.

## Retention And Image Metadata

1. Accepted submission artifacts are classified as `submitted_probe_artifact` and use a 365-day retention boundary derived from `submitted_at`.
2. The Worker writes encrypted R2 objects with explicit retention metadata (`retention_class`, `delete_after`, `image_metadata_policy`) so operational cleanup does not rely on oral history.
3. The repository currently computes the D1 retention boundary from `submitted_at` plus the shared retention policy rather than storing a separate per-row deadline column.
4. User-submitted images that contain sensitive or suspicious embedded metadata markers (for example JPEG APP1/APP13/comment markers or PNG textual/exif chunks) are rejected before encryption and storage.
5. Benign JPEG profile markers such as ICC/App2 are not rejected on their own; the validation goal is privacy protection, not blanket rejection of every metadata-like segment.
6. Plaintext metadata persisted in D1 remains intentionally minimal: `image_mime`, `image_bytes`, and `image_uploaded_at` only.

## Constant-Time Handling

1. Token-hash comparisons must not rely on short-circuit string equality.
2. Any future secret comparison logic must use the same non-short-circuit approach or an equivalent constant-time primitive.

## Randomness Expectations

1. The application relies on the platform Web Crypto CSPRNG rather than a custom entropy pool.
2. Token issuance plus submission-payload and image-envelope IV generation keep randomness centralized in small worker security modules so demand, size, and fallback behavior remain reviewable.
3. Load-related validation is provided by integration coverage and inventory review rather than a separate bespoke RNG implementation. Clever entropy daemons are how teams accidentally become folklore collectors.
