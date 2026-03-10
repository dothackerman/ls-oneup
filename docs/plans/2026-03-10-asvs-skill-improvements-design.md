# ASVS Skill Improvements Design

Date: 2026-03-10

## Problem

The initial ASVS skill required excessive tool calls for a single invocation:
- Manual JSON parsing after `npm run asvs:run` to extract summary stats
- No auto-resolution of obviously irrelevant controls (e.g., WebRTC for a non-WebRTC app)
- No documented checklist schema (agent had to probe structure)
- No separation between pipeline execution and codebase-aware triage
- No documented role separation between auditor and coder

## Design decisions

### 1. Gate script emits structured summary

`asvs-gate.mjs` now prints a `--- ASVS GATE SUMMARY ---` block to stdout with all key metrics. The invoking agent reports this output directly — no post-run JSON parsing needed.

### 2. Tech-stack pre-filter in audit script

`asvs-audit.mjs` derives a capability set from existing artifacts only:
- `package.json` dependencies
- File globs (code markers in indexed source files)
- `wrangler.jsonc` bindings

Controls targeting absent technologies are auto-resolved as `not_applicable` with evidence-based reasoning. Conservative: only filters on hard signals (dependency absence AND zero code markers).

No new manifest files are created. If a tech-profile document exists someday (e.g., for arc42), the script can optionally consume it, but it is not a prerequisite.

### 3. Unified flow with agent triage

Single `/asvs-vos` invocation runs:
1. Safety gate (Opus 4.6 verification)
2. `npm run asvs:run` (sync + pre-filter audit + gate)
3. Agent triage: parallel Opus 4.6 subagents per chapter for remaining `todo` items
4. Re-validate with `npm run asvs:gate`

### 4. Strict role separation

- **Auditor** (this skill): Diagnoses gaps thoroughly. Read codebase, write ASVS artifacts only. Never prescribes solutions.
- **Coder** (separate): Reads auditor findings, researches, designs implementation plan, gets user approval, implements.

The `todo` entry is the interface contract between roles: control title (the *what*), auditor reasoning (the *gap*), code references (the *where*).

### 5. Checklist schema documented inline

SKILL.md now documents the `checklist.machine.json` schema so agents don't need to probe the structure.

## Changes

| File | Change |
|------|--------|
| `scripts/asvs-audit.mjs` | Added tech-stack pre-filter with `TECH_ABSENCE_RULES` |
| `scripts/asvs-gate.mjs` | Added structured summary output block |
| `.agents/skills/asvs-vos/SKILL.md` | Rewritten: unified flow, schema docs, triage instructions, role separation |
| `.claude/agents/asvs-vos-auditor.md` | Aligned with unified flow, added subagent dispatch, strict role separation |
| `.claude/commands/asvs-vos.md` | Updated to reference gate summary and triage step |

## Trade-offs

- **Pre-filter is conservative**: only marks `not_applicable` for clearly absent tech. False negatives (leaving items as `todo`) are acceptable — agents catch them. False positives (wrongly marking `not_applicable`) are the risk, so only hard signals are used.
- **Subagent cost**: up to 17 chapters x 1 agent each. Parallelism makes it fast but uses more tokens. Worth it for accuracy over sequential single-pass.
- **No single-purpose artifacts**: tech detection derives from existing files. No manifest created just for ASVS.
