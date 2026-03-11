# agents.empty

Minimal bootstrap entrypoint for first-pass agents.

## Default Load (Always)
1. `AGENTS.md`
2. `.agents/00-router.md`
3. `docs/requirements/00-index.md`

## Conditional Load (Only When Triggered)
1. Follow `.agents/20-task-routing.json`.
2. Load only files mapped to the detected change type.
3. Do not load UX docs unless UX triggers are present.

## Goal
Keep initial context small; expand only for relevant work.
