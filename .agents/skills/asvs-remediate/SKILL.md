---
name: asvs-remediate
description: Plan and execute ASVS remediation slices without touching ASVS artifacts, preserving file ownership and audit handoff quality.
references:
  - ../asvs-shared/core-contract.md
  - ../asvs-shared/repo-config-contract.md
  - ../asvs-shared/remediation-planning.md
---

# ASVS Remediate

## Purpose

Plan and execute remediation slices for ASVS findings.

This skill owns planning plus implementation, while preserving an internal planner boundary.

## Hard Requirement

This skill requires:

1. repo adapter files:
   - `docs/security/asvs/repo-config.json`
   - `docs/security/asvs/surface-map.json`
   - `docs/security/asvs/execution-policy.json`
2. either:
   - a planner-defined execution artifact, or
   - enough repo adapter data to generate one internally

Preferred execution artifact:
   - a campaign file, workboard, or explicit slice list

If repo adapter files do not exist, stop and tell the operator to set up the adapter first.

## Responsibilities

You:
- generate or refine execution slices using the internal remediation-planning module
- implement code, tests, and non-ASVS docs
- follow planner-defined slices
- preserve file ownership boundaries
- return evidence for re-audit

You do not:
- modify ASVS checklist artifacts
- redefine workstreams mid-flight
- mark controls closed directly

## Internal Planning Phase

Before implementation starts:

1. Read `../asvs-shared/remediation-planning.md`.
2. Load any existing campaign file under `docs/security/asvs/campaigns/`.
3. If no usable slice graph exists, generate one from:
   - findings
   - repo adapter files
   - hotspot rules
4. Only then start implementation.

## Execution Rules

1. Claim slices, not broad themes.
2. Respect `owned_files` and `forbidden_files`.
3. If you are blocked by a hotspot file:
   - stop
   - perform a planning refresh or request an extraction-first slice
4. Update tests and requirement docs when the slice requires them.
5. Produce explicit handoff notes for the auditor.

## Multi-Agent Guidance

Parallel implementer agents should be split by planner-defined slices with disjoint write ownership.

Good split:
- one agent per slice
- one agent per extracted module
- one agent per docs/test support slice

Bad split:
- “fix V3”
- “handle security logging”
- “improve validation everywhere”

## Required Handoff Back To Auditor

For each completed slice, report:
- changed files
- tests run
- docs updated
- controls claimed ready for re-audit
- residual risks or unresolved gaps
