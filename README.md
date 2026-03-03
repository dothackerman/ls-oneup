# Leaf Sap One Up (`ls-oneup`)

Prototype planning repository for the Leaf Sap One Up project.

## Current Repository State

This repo currently contains product/requirements documentation only.  
There is no application code yet.

### Available documents

- `docs/requirements/01-customer-wishes.md`
  - Consolidated functional wishes and constraints for Milestone 1.
- `docs/requirements/02-milestones.md`
  - Shippable milestone definitions (M1 to M3) with scope and acceptance criteria.
- `docs/requirements/03-open-questions.md`
  - Remaining open and deferred decisions (technical, governance, later milestones).
- `docs/requirements/04-tech-stack-decision-memo.md`
  - Research-based comparison of two deployment/stack options with M1-free and M2-cost outlook.
- `docs/requirements/05-agent-tooling-and-local-flow.md`
  - Multi-agent tooling setup, read-first MCP usage, and manual-only release policy.
- `docs/requirements/06-application-tech-stack-memo.md`
  - Selected application stack on Cloudflare (SPA-first) with architecture and risk baseline.

## Project Focus (now)

The current focus is Milestone 1 (MVP):

- Admin creates probe-specific one-time links and QR codes.
- Farmer submits mandatory probe context data (online-only flow).
- Admin can review submissions and override crop name.

## Next Steps

1. Translate the selected application stack into concrete implementation tickets.
2. Define API/data model from the M1 requirements.
3. Start implementation with local-first quality gates and manual release.
