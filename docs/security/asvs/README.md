# ASVS / vOS Security Checklist Pipeline

This directory tracks OWASP ASVS source state and local codebase validation.

## Files

- `source-state.json` — latest upstream source metadata (commit + blob hash + checked time)
- `version-history.jsonl` — append-only check history
- `checklist.machine.json` — machine-readable checklist with status/reasoning/code refs
- `checklist.human.md` — human-readable report
- `checklist.findings.jsonl` — append-only per-item audit findings
- `checklist.delta.json` — machine-readable diff vs previous run
- `checklist.delta.md` — human-readable delta summary

## Workflow

1. Sync upstream ASVS source and (re)build checklist baseline:

```bash
npm run asvs:sync
```

2. Audit local codebase against checklist:

```bash
npm run asvs:audit
```

3. Enforce quality gate:

```bash
npm run asvs:gate
```

Or run all in one:

```bash
npm run asvs:run
```

## Status semantics

- `completed` — implemented and evidenced in code references
- `todo` — not yet implemented or missing evidence
- `not_applicable` — out of scope for this codebase (must include reasoning)

## Severity semantics for unmet controls

- `critical`
- `high`
- `medium`
- `low`
- `none` (for completed / not applicable)

## Responsibility note

The associated auditor instructions (`.claude/agents/asvs-vos-auditor.md`) allow any available model. The repository owner is responsible for reviewing findings quality before relying on audit results.
