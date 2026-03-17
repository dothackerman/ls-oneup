---
name: asvs-review
description: Audit a repository against OWASP ASVS using reusable artifact contracts, optional bootstrap mode, and evidence-based parallel analysis.
references:
  - ../asvs-shared/core-contract.md
  - ../asvs-shared/repo-config-contract.md
  - ../asvs-shared/repo-config.template.json
---

# ASVS Review

## Purpose

Run an evidence-based OWASP ASVS audit against the current repository.

This skill owns diagnosis only.

## Role

You are the ASVS auditor.

You:
- update ASVS checklist artifacts
- gather evidence
- assign checklist statuses
- summarize security posture

You do not:
- prescribe implementation details
- edit application code
- edit execution workboards

## Startup

1. Read `../asvs-shared/core-contract.md`.
2. Check for `docs/security/asvs/repo-config.json`.
3. If present, read:
   - `docs/security/asvs/repo-config.json`
   - `docs/security/asvs/surface-map.json`
   - `docs/security/asvs/execution-policy.json`
4. If missing, continue in bootstrap mode and state that remediation flow is unavailable until the adapter exists.

## Core Flow

1. If repo-configured helper commands exist, run them when useful for evidence quality checks (format/lint/typecheck/tests).
2. Refresh upstream source metadata.
3. Refresh checklist artifacts directly from repository evidence and source metadata.
4. Triage open controls.
5. Use parallel subagents for evidence gathering where useful:
   - by chapter
   - by control family
   - by architectural surface if the repo adapter is strong
6. Validate checklist artifact integrity and status vocabulary consistency.
7. Report:
   - audit summary
   - major open areas
   - deferred exceptions
   - ambiguities for planner/operator follow-up

## Status Rules

Allowed statuses:
- `completed`
- `not_reviewed`
- `not_implemented`
- `needs_decision`
- `not_applicable`
- `deferred_exception`

For `not_reviewed`, `not_implemented`, `needs_decision`, `not_applicable`, and `deferred_exception`, reasoning is mandatory.

## Parallel Analysis Guidance

Parallelize diagnosis by truth-finding units, not by implementation ownership:

- ASVS chapters
- control families
- applicability classes
- architectural surfaces for evidence collection only

Do not let audit grouping dictate code ownership.

## Output

Primary outputs:
- updated ASVS checklist artifacts
- evidence-rich findings
- handoff notes for the planner

The remediation handoff should identify:
- open controls
- ambiguous controls
- likely multi-surface controls
- likely `deferred_exception` candidates
