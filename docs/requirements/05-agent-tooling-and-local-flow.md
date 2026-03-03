# Agent Tooling and Local-First Workflow

## Purpose
Define how multi-agent development is supported for M1 while keeping Cloudflare release actions manual.

## Decisions Implemented
1. Deployment platform is Cloudflare (from `04-tech-stack-decision-memo.md` outcome).
2. Cloudflare skills installed for agent usage:
   - `cloudflare`
   - `wrangler`
   - `web-perf`
3. MCP is configured in read-first mode:
   - enabled now: `cloudflare-docs`
   - deferred for later: `cloudflare-builds`, `cloudflare-observability`

## Release Policy
1. Cloudflare deployment/release must not be executed by agents in this phase.
2. Agents can prepare code, tests, docs, and deployment instructions.
3. Human operator executes release commands manually.

## Local-First Quality Gate
Run local checks before any manual cloud release:
1. Linting
2. Typecheck
3. Unit tests
4. Integration tests
5. E2E tests
6. Manual smoke test

Example command sequence (to refine once stack is finalized):
```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Why This Setup
1. Supports multi-agent velocity with shared Cloudflare knowledge.
2. Reduces accidental cloud usage while prototype architecture is still evolving.
3. Preserves low-cost operation and avoids unnecessary build/deploy churn.

## Deferred
1. Enabling `cloudflare-builds` MCP.
2. Enabling `cloudflare-observability` MCP.
3. Automating release via CI/CD agents.
