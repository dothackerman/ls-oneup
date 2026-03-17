# M1 ASVS Audit Agent + Checklist Contract

## Goal

Establish a repeatable security-audit workflow that:

1. Uses official OWASP ASVS source data from GitHub.
2. Tracks upstream version/hash check history locally.
3. Maintains both machine-readable and review-friendly checklist states.
4. Supports full-repository validation with code references and reasoning.
5. Documents owner responsibility for reviewing audit quality before relying on results.

## Scope

In scope:
- Reusable ASVS skill contract plus repo-local adapter files.
- Source sync process from OWASP/ASVS.
- Local tracking files and update process.
- Repository-wide checklist evaluation and findings output.

Out of scope:
- Auto-remediation of all findings.
- Production deployment gates based on ASVS status.
- Implementation-lane ownership for code changes. That belongs to the Level 2 execution workboard and implementation plan, not the auditor contract.

## Responsibility contract

The audit workflow must document that:
- It may run with any available model.
- The repository owner is responsible for reviewing findings quality before relying on audit output.

## Local artifacts

`docs/security/asvs/`:
- `source-state.json`
- `version-history.jsonl`
- `checklist.machine.json`
- `checklist.md`
- `checklist.findings.jsonl`
- `checklist.delta.json`
- `checklist.delta.md`
- `README.md`

Primary reader entry points:
- `docs/security/README.md`
- `docs/security/asvs/README.md`
- `docs/security/asvs/checklist.md`
- `docs/security/asvs/repo-config.json`

## Commands

- `npm run asvs:sync`
- `npm run asvs:audit`
- `npm run asvs:gate`
- `npm run asvs:run`

## Checklist row contract

Each requirement row must include:
- `requirement_id`
- `status` (`completed|todo|not_applicable|deferred_exception`)
- `severity` (`critical|high|medium|low|none`)
- `reasoning`
- `code_references` (array of `file:line`)

Status semantics:
- `completed` — implemented and evidenced in code references
- `todo` — not yet implemented or still missing enough evidence
- `not_applicable` — out of scope for this codebase, with specific reasoning
- `deferred_exception` — operator-accepted exception for a control that remains open; this is not equivalent to completion and must retain explicit reasoning

## Acceptance criteria

1. Running `npm run asvs:sync` refreshes upstream metadata and baseline checklist.
2. Running `npm run asvs:audit` evaluates all checklist items and writes findings.
3. Checklist report prioritizes readability for reviewers, including status summary, level summary, and chapter summary.
4. Repo adapter files exist under `docs/security/asvs/` so global `asvs-review` and `asvs-remediate` skills can operate without repo-local skill logic.
