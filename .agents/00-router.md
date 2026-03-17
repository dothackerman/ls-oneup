# Agent Router

Purpose: route agents to only the required docs/checklists for the detected change type.

## Always Load
1. `AGENTS.md`
2. `.agents/10-global-rules.md`
3. `docs/requirements/00-index.md`

## Routing Source
1. Use `.agents/20-task-routing.json` for keyword/path-based routing.
2. Load a maximum of 3 additional files for the selected route.
3. If multiple routes match, load only the highest-priority route unless the task explicitly spans domains.
4. For production deploy/migration/release tasks, prefer the dedicated `release-deploy` route so `docs/production-release-setup.md` is included.

## Priority
1. security
2. data-contract
3. ux
4. backend
5. frontend-non-ux

## Constraints
1. Do not bulk-load all requirement docs.
2. If unsure, start with smallest route and expand only if blocked.
