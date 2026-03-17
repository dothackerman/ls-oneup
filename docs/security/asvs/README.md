# ASVS / vOS Security Skill Workflow

This directory tracks OWASP ASVS source state and local codebase validation artifacts.
This README is maintenance-oriented. Start with [security index](../README.md) or [ASVS checklist](./checklist.md).

Global reusable skills:
- `asvs-review`
- `asvs-remediate`

Repo-local adapter files in this repository:
- `repo-config.json`
- `surface-map.json`
- `execution-policy.json`
- `campaigns/*.json`

## Recommended Entry Points

1. [Security documentation index](../README.md)
2. [ASVS checklist](./checklist.md)
3. [Machine-readable checklist](./checklist.machine.json)
4. [Checklist delta summary](./checklist.delta.md)
5. [ASVS audit contract](../../requirements/13-m1-asvs-audit-agent-and-checklist.md)
6. [Repo adapter config](./repo-config.json)
7. [Surface map](./surface-map.json)
8. [Execution policy](./execution-policy.json)
9. [Active campaigns](./campaigns/2026-03-level2.json)

## Files

- [source-state.json](./source-state.json) — latest upstream source metadata (commit + blob hash + checked time)
- [version-history.jsonl](./version-history.jsonl) — append-only check history
- [checklist.machine.json](./checklist.machine.json) — machine-readable checklist with status/reasoning/code refs
- [checklist.md](./checklist.md) — checklist report
- [checklist.findings.jsonl](./checklist.findings.jsonl) — append-only per-item audit findings
- [checklist.delta.json](./checklist.delta.json) — machine-readable diff vs previous run
- [checklist.delta.md](./checklist.delta.md) — delta summary

## Workflow

This repository is skill-driven for ASVS. Run ASVS from the reusable skills:

```bash
/asvs-review
```

Use remediation for implementation slices only:

```bash
/asvs-remediate
```

Then run `/asvs-review` again to refresh checklist state from new evidence.

There is no CI enforcement or package-script gate for ASVS in this repository.

## Status semantics

- `completed` — implemented and evidenced in code references
- `not_reviewed` — preliminary evidence exists but control verification is still pending
- `not_implemented` — no implementation evidence found yet for the control
- `needs_decision` — implementation/evidence depends on explicit operator or architecture decisions
- `not_applicable` — out of scope for this codebase (must include reasoning)
- `deferred_exception` — operator-accepted exception for an open control (must include reasoning and is not a completion)

## Severity semantics for unmet controls

- `critical`
- `high`
- `medium`
- `low`
- `none` (for completed / not applicable)

## Responsibility note

The global `asvs-review` skill may run with any available model. The repository owner is responsible for reviewing findings quality before relying on audit results.

## One-time cleanup note

Legacy script-based ASVS execution (`npm run asvs:*`) was removed in this repository in favor of skill-first operation and adapter-driven artifacts. Historical references may still exist in older planning documents, but active operational flow is exclusively skill-based.
