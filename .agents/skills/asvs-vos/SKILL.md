---
name: asvs-vos
description: Opus-gated recurring ASVS/vOS security audit skill for ls-oneup. Syncs official OWASP ASVS source, auto-filters absent technologies, dispatches Opus 4.6 subagents for codebase-aware triage, and emits machine+human checklist artifacts with evidence-based reasoning.
references:
  - docs/security/asvs/README.md
  - .claude/agents/asvs-vos-auditor.md
---

# ASVS / vOS Audit Skill

## Purpose

Run a recurring, evidence-based security checklist process against this repository using OWASP ASVS as source of truth. The skill performs diagnosis only — it identifies and documents what is not fulfilled from the ASVS perspective. It never prescribes solutions or makes code changes.

## Safety precondition

This skill MUST be executed by Opus 4.6. All subagents spawned during triage MUST also be Opus 4.6.

If active model is not Opus 4.6, stop and output:

> Safety gate: this audit command is restricted to Opus 4.6 due to prompt-injection and policy-integrity risk. Please switch to Opus 4.6, then re-run `/asvs-vos`.

## Unified flow

One command runs the entire pipeline:

```bash
npm run asvs:run
```

This executes three steps in sequence:

1. **Sync** (`asvs:sync`) — Fetch upstream OWASP ASVS source from GitHub. Update `source-state.json` and `version-history.jsonl`. Merge with existing checklist (preserves prior audit state).
2. **Audit** (`asvs:audit`) — Tech-stack pre-filter auto-resolves `not_applicable` controls for absent technologies (derived from `package.json` + file globs + `wrangler.jsonc`). Remaining controls get keyword-level code references.
3. **Gate** (`asvs:gate`) — Validates checklist integrity and emits structured summary to stdout.

After `npm run asvs:run` completes, **report the gate summary output directly** — no additional parsing needed.

## Agent triage (post-pipeline)

After the pipeline runs, remaining `todo` items need codebase-aware triage by Opus 4.6 subagents:

1. Read `checklist.machine.json` to get the list of `todo` items.
2. Group `todo` items by ASVS chapter (V1–V17).
3. For each chapter with `todo` items, spawn a parallel Opus 4.6 subagent.
4. Each subagent:
   - Receives: the control definitions for its chapter, full codebase access (read-only).
   - Evaluates each control against the actual codebase.
   - Updates status to `completed`, `not_applicable`, or keeps as `todo`.
   - Writes thorough, evidence-based `reasoning` (see "Reasoning quality" below).
   - Sets `code_references` to specific `file:line` locations.
   - Returns updated rows.
5. Merge all subagent results back into `checklist.machine.json`.
6. Re-run `npm run asvs:gate` to validate the updated checklist.
7. Report final gate summary.

## Reasoning quality

The auditor's job is **diagnosis, not prescription**. Every `todo` and `not_applicable` entry must have reasoning that is:

- **Specific**: names what the control requires and what is missing or present.
- **Evidence-based**: references actual files, lines, dependencies, or configuration.
- **Non-prescriptive**: describes the gap, never suggests implementation.

Good reasoning example:
> "Application serves responses from worker/index.ts without setting Content-Security-Policy header. No CSP is configured at Cloudflare level either (verified via wrangler.jsonc). The SPA loads Google Fonts from external CDN (index.html:8). Inline scripts are not used."

Bad reasoning example:
> "Add CSP header middleware in worker/index.ts with policy: default-src 'self'; font-src fonts.gstatic.com"

## Role separation

| Role | Responsibility |
|------|---------------|
| ASVS auditor (this skill) | Diagnose gaps thoroughly. Read codebase, write ASVS artifacts only. |
| Coding agent (separate) | Read auditor findings, research, design implementation plan, get user approval, implement. |

The auditor MUST NOT make code changes. The auditor MUST NOT suggest implementations. The coding agent MUST NOT modify ASVS artifacts.

## Checklist JSON schema

`checklist.machine.json` structure:

```
{
  "metadata": {
    "generated_at": "ISO 8601",
    "source_repo": "OWASP/ASVS",
    "source_ref": "master",
    "source_commit_sha": "string",
    "source_blob_sha": "string",
    "source_path": "string",
    "last_audited_at": "ISO 8601",
    "audited_item_count": number,
    "pre_filtered_count": number
  },
  "checklist": [
    {
      "requirement_id": "V1.1.1",
      "chapter": "V1 Encoding and Sanitization ...",
      "title": "Verify that ...",
      "level": "2",
      "status": "todo | completed | not_applicable",
      "severity": "critical | high | medium | low | none",
      "reasoning": "Evidence-based gap description",
      "code_references": ["file:line", ...],
      "source": {
        "upstream_version": "5.0.0",
        "upstream_path": "..."
      },
      "last_audited_at": "ISO 8601"
    }
  ]
}
```

## Expected tool calls

A typical `/asvs-vos` invocation requires:

1. `Read`: `SKILL.md`, `asvs-vos-auditor.md` (skill + agent context)
2. `Bash`: `npm run asvs:run` (sync + audit + gate pipeline)
3. `Read`: `checklist.machine.json` (load todo items for triage)
4. `Agent` (parallel): one per chapter with remaining `todo` items
5. `Bash`: `npm run asvs:gate` (re-validate after triage)

## Output artifacts

- `docs/security/asvs/source-state.json`
- `docs/security/asvs/version-history.jsonl`
- `docs/security/asvs/checklist.machine.json`
- `docs/security/asvs/checklist.human.md`
- `docs/security/asvs/checklist.findings.jsonl`
- `docs/security/asvs/checklist.delta.json`
- `docs/security/asvs/checklist.delta.md`

## Quality criteria

The run is valid only if `npm run asvs:gate` passes:

1. No unknown requirement IDs.
2. Non-empty checklist.
3. Every `todo` or `not_applicable` row has reasoning.

## Recurrence model

Run this skill periodically (e.g., weekly or after significant code changes) and compare:
- Upstream source/hash changes (version-history)
- Local checklist delta (delta report)

This creates an auditable security-control evolution trail over time.
