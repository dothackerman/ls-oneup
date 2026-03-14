# M1 ASVS Audit Agent + Checklist Contract

## Goal

Establish a repeatable security-audit workflow that:

1. Uses official OWASP ASVS source data from GitHub.
2. Tracks upstream version/hash check history locally.
3. Maintains both machine-readable and human-readable checklist states.
4. Supports full-repository validation with code references and reasoning.
5. Documents owner responsibility for reviewing audit quality before relying on results.

## Scope

In scope:
- Claude custom agent prompt contract for ASVS/vOS auditing.
- Source sync process from OWASP/ASVS.
- Local tracking files and update process.
- Repository-wide checklist evaluation and findings output.

Out of scope:
- Auto-remediation of all findings.
- Production deployment gates based on ASVS status.

## Responsibility contract

The audit workflow must document that:
- It may run with any available model.
- The repository owner is responsible for reviewing findings quality before relying on audit output.

## Local artifacts

`docs/security/asvs/`:
- `source-state.json`
- `version-history.jsonl`
- `checklist.machine.json`
- `checklist.human.md`
- `checklist.findings.jsonl`
- `checklist.delta.json`
- `checklist.delta.md`
- `README.md`

Primary reader entry points:
- `docs/security/README.md`
- `docs/security/asvs/README.md`
- `docs/security/asvs/checklist.human.md`

## Commands

- `npm run asvs:sync`
- `npm run asvs:audit`
- `npm run asvs:gate`
- `npm run asvs:run`

## Checklist row contract

Each requirement row must include:
- `requirement_id`
- `status` (`completed|todo|not_applicable`)
- `severity` (`critical|high|medium|low|none`)
- `reasoning`
- `code_references` (array of `file:line`)

## Acceptance criteria

1. Running `npm run asvs:sync` refreshes upstream metadata and baseline checklist.
2. Running `npm run asvs:audit` evaluates all checklist items and writes findings.
3. Human report includes top-severity backlog and full checklist table.
4. Agent instructions exist under `.claude/agents/asvs-vos-auditor.md`.
