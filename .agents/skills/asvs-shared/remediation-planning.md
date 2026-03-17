# ASVS Remediation Planning Module

This module is an internal planning layer used by the public `asvs-remediate` skill.

Its job is to translate ASVS findings into an execution graph that is safe for concurrent implementation.

## Inputs

- ASVS checklist state
- ASVS findings
- repo adapter files
- optional campaign files under `docs/security/asvs/campaigns/`

## Responsibilities

1. map controls to architectural surfaces
2. map surfaces to current files
3. identify hotspots
4. define workstreams and slices
5. identify decision dependencies
6. specify what can run in parallel

## Planning Rules

1. Plan by architecture, not by ASVS chapter order.
2. Treat hotspot files as scheduling problems, not as shared ownership.
3. Split work into claimable slices, not themes.
4. If a slice touches a hotspot, either:
   - isolate it by extraction first, or
   - serialize it explicitly.
5. Distinguish:
   - code
   - docs
   - infra
   - mixed
   - `deferred_exception` candidates

## Required Slice Contract

Each implementation slice should define:
- `slice_id`
- `goal`
- `controls_covered`
- `owned_files`
- `supporting_files`
- `forbidden_files`
- `depends_on`
- `parallel_with`
- `tests_required`
- `docs_required`
- `done_when`
- `handoff_to_auditor`

## Success Condition

The planning phase is successful when implementation subagents can be spawned with disjoint or explicitly sequenced write ownership.
