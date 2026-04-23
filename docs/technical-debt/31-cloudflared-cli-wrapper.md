# Technical Debt: Issue 31 Cloudflare Access Agent Workflow

## Status

Accepted short-term path with deferred hardening.

## Date

2026-04-23

## Related Issue

- GitHub issue `#31`

## Context

`ls-oneup` currently uses Cloudflare Access to protect the admin UI and admin API. That choice was pragmatic for a small project because it avoided building in-app identity management.

The new need is to let the operator's Claude Co-Work workflow read probe data and probe images programmatically. The existing admin API already exposes the required read data, but browser-oriented Cloudflare Access login creates friction for agent and CLI usage.

At this stage the priority is the fastest low-cost path that unblocks the operator workflow without introducing a larger auth redesign.

## Decision

Use existing Cloudflare Access authentication with `cloudflared` and add a local read-only CLI wrapper for Claude Co-Work.

Short-term implementation boundary:

1. Keep existing `/api/admin/*` routes unchanged.
2. Keep existing Cloudflare Access protection unchanged.
3. Build a local CLI wrapper that exposes only the read operations needed by Claude Co-Work.
4. Have that wrapper use `cloudflared` to authenticate as the human operator against the existing admin API.

Rejected for this slice:

1. New `/api/external/*` routes.
2. Custom Worker API-key auth.
3. Service-token-based route split.
4. Managed OAuth rollout.

Those options may still become relevant later. They are intentionally postponed, not disproven forever.

## Why This Path

1. Lowest implementation cost.
2. No Worker or backend auth changes required.
3. Reuses current Cloudflare Access setup.
4. Lets the team validate whether the agent workflow is actually valuable before paying the complexity bill for a cleaner operator API.

## Explicit Technical Debt

This choice is a workflow guardrail, not a server-side read-only authorization boundary.

Known debt:

1. The wrapper can expose only read commands, but the underlying authenticated human session still has whatever authority the admin user already has.
2. An unconstrained shell-capable agent or human can bypass the wrapper and call write-capable `/api/admin/*` endpoints directly.
3. The current auth model remains human-admin-wide, not least-privilege and not task-scoped.
4. The operator automation workflow depends on local `cloudflared` setup and session state, which is operationally convenient but not a clean application-level contract.

## Deferred Hardening

Revisit this decision if any of the following becomes true:

1. The workflow must run headless with no interactive human login.
2. A true read-only authorization boundary is required.
3. Multiple operators or non-owner users need distinct permissions.
4. The browser admin UI becomes secondary and the operator API becomes the primary control surface.
5. External integrations need a stable programmatic contract that should not depend on local CLI behavior.

## Future Options To Revisit

1. Managed OAuth on the existing Cloudflare Access application for user-authenticated agent access with a more standard flow.
2. Cloudflare Access service tokens for machine identity.
3. A dedicated operator API surface with separate routes and explicit read-only server-side authorization.
4. A separate Worker or service if operator traffic grows into an independent product surface.

## Guardrails For The Implementation Slice

The wrapper implemented under issue `#31` should:

1. Expose only allowlisted read commands.
2. Avoid raw method and URL passthrough.
3. Never print auth tokens, cookies, or sensitive request headers.
4. Return machine-readable JSON for list and lookup operations.
5. Return a clear human-actionable auth error when `cloudflared` login is missing or expired.
