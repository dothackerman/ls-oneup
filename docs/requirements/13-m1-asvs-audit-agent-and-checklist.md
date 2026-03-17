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

## Operator entry points

- `/asvs-review`
- `/asvs-remediate`

ASVS is intentionally skill-driven in this repository; script/CI gates are out of scope for this contract.

## Checklist row contract

Each requirement row must include:
- `requirement_id`
- `status` (`completed|not_reviewed|not_implemented|needs_decision|not_applicable|deferred_exception`)
- `severity` (`critical|high|medium|low|none`)
- `reasoning`
- `code_references` (array of `file:line`)

Status semantics:
- `completed` — implemented and evidenced in code references
- `not_reviewed` — preliminary evidence exists but control verification is still pending
- `not_implemented` — no implementation evidence found yet for the control
- `needs_decision` — implementation/evidence depends on explicit operator or architecture decisions
- `not_applicable` — out of scope for this codebase, with specific reasoning
- `deferred_exception` — operator-accepted exception for a control that remains open; this is not equivalent to completion and must retain explicit reasoning

## Acceptance criteria

1. Running `/asvs-review` refreshes upstream metadata, checklist state, and findings artifacts.
2. Running `/asvs-remediate` implements selected slices without directly editing ASVS checklist artifacts.
3. Checklist report prioritizes readability for reviewers, including status summary, level summary, and chapter summary.
4. Repo adapter files exist under `docs/security/asvs/` so global `asvs-review` and `asvs-remediate` skills can operate without repo-local ASVS script logic.
