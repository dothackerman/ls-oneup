---
name: asvs-vos
description: Opus-gated recurring ASVS/vOS security audit skill for ls-oneup. Syncs official OWASP ASVS source, tracks hashes/versions, audits full codebase, and emits machine+human checklist artifacts with code references and reasoning.
references:
  - docs/security/asvs/README.md
  - .claude/agents/asvs-vos-auditor.md
---

# ASVS / vOS Audit Skill

## Purpose

Run a recurring, evidence-based security checklist process against this repository using OWASP ASVS as source of truth.

## Safety precondition

This skill is intended to be executed by the Opus-gated custom Claude runbook:
`.claude/agents/asvs-vos-auditor.md`.

If active model is not Opus 4.6, stop and request model switch first.

## Commands

- Full recurring run:

```bash
npm run asvs:run
```

- Step-by-step:

```bash
npm run asvs:sync
npm run asvs:audit
npm run asvs:gate
```

## Required outputs

- `docs/security/asvs/source-state.json`
- `docs/security/asvs/version-history.jsonl`
- `docs/security/asvs/checklist.machine.json`
- `docs/security/asvs/checklist.human.md`
- `docs/security/asvs/checklist.findings.jsonl`
- `docs/security/asvs/checklist.delta.json`
- `docs/security/asvs/checklist.delta.md`

## Quality criteria

The run is only valid if `npm run asvs:gate` passes:

1. No unknown requirement IDs.
2. Non-empty checklist.
3. Every `todo` or `not_applicable` row has reasoning.

## Recurrence model

Run this skill periodically (e.g., daily/weekly) and compare:
- upstream source/hash changes (version-history)
- local checklist delta (delta report)

This creates an auditable security-control evolution trail over time.
