# M1 ASVS Audit Agent + Checklist Contract

## Goal

Establish a repeatable security-audit workflow that:

1. Uses official OWASP ASVS source data from GitHub.
2. Tracks upstream version/hash check history locally.
3. Maintains both machine-readable and human-readable checklist states.
4. Supports full-repository validation with code references and reasoning.
5. Enforces high-safety model selection for Claude-based audit execution.

## Scope

In scope:
- Claude custom agent prompt contract for ASVS/vOS auditing.
- Source sync process from OWASP/ASVS.
- Local tracking files and update process.
- Repository-wide checklist evaluation and findings output.

Out of scope:
- Auto-remediation of all findings.
- Production deployment gates based on ASVS status.

## Safety contract

The audit agent must enforce:
- Required model: **Opus 4.6**.
- If a different model is active, stop and request user to switch.

## Local artifacts

`docs/security/asvs/`:
- `source-state.json`
- `version-history.jsonl`
- `checklist.machine.json`
- `checklist.human.md`
- `checklist.findings.jsonl`
- `README.md`

## Commands

- `npm run asvs:sync`
- `npm run asvs:audit`

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
