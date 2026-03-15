# Dependency Risk Register

## Purpose
Track the runtime and platform components that carry disproportionate security or operational risk for M1 so future changes do not rely on oral history.

## Register
| Component | Why It Is Risky | Current Mitigation | Residual Risk |
| --- | --- | --- | --- |
| Cloudflare Access | Misconfiguration would expose `/admin` and `/api/admin/*` directly. | Access protection is part of the release preconditions and smoke checks in the runbook and API contract. | Protection is deployment-dependent and cannot be fully enforced from repo code alone. |
| D1 conditional submit write | One-time semantics depend on the update remaining conditional under race. | Submit acceptance uses a single conditional write and integration coverage exercises first-submit-wins behavior. | Future schema or query drift could weaken the guard if not covered by tests. |
| R2 object storage | Uploads can succeed before the DB write commits, creating orphaned objects or residual sensitive content. | Best-effort orphan cleanup is implemented and logged; admin reads use the stored DB reference instead of bucket listing. | Cleanup is best effort, not transactional. |
| Submission encryption key ring | Missing, malformed, or rotated secrets can block reads/writes. | Crypto operations fail closed; key-ring policy is documented in [crypto-policy.md](./crypto-policy.md). | Operators still need disciplined secret rollout and retirement timing. |
| Token HMAC key ring | Incorrect rotation can invalidate links or weaken verification evidence. | Versioned hashes, legacy support, and fail-closed config handling are implemented. | Outstanding links depend on operators retaining legacy keys long enough. |
| User-supplied image uploads | Files are attacker-controlled input and can stress parsing, storage, and browser rendering assumptions. | Current contract restricts uploads to one JPEG/PNG up to 2 MB; browser-visible image handling is covered by API and integration tests. | Deeper upload hardening and metadata posture still depend on later slices. |
| Worker/browser security headers | Incorrect or partial headers can leave browser-side controls implied rather than enforced. | Sensitive API routes and app-shell responses now apply a shared header policy, while deployment-only transport controls are documented in the runbook. | HTTPS redirect, TLS posture, and HSTS still depend on edge configuration outside repo code. |
| Frontend app shell and admin UI | Browser-visible behavior can quietly drift away from server policy. | Contract docs and E2E coverage exist for key admin/farmer flows. | Full frontend alignment remains dependent on `F1-frontend-security-alignment`. |

## Review Rules
1. Add or update an entry when a change introduces a new security-sensitive platform dependency, third-party package in a critical path, or dangerous capability.
2. Prefer concrete failure modes over generic “security concern” language.
3. Keep mitigations tied to code, tests, or operator procedures that actually exist.
