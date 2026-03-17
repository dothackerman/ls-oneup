# ASVS Core Contract

This document defines the reusable contract shared by the public `asvs-review` and `asvs-remediate` skills.

`asvs-remediate` contains an internal planning layer that must remain logically distinct from implementation.

## Fixed Roles

1. Auditor:
   - diagnoses security posture against OWASP ASVS
   - updates ASVS checklist artifacts
   - never prescribes implementation details
   - never edits application code
2. Planner:
   - converts findings into executable implementation slices
   - owns concurrency, hotspot, and file-ownership planning
   - never closes checklist controls directly
   - never edits ASVS checklist artifacts
3. Implementer:
   - executes planner-defined slices
   - edits code, tests, and non-ASVS docs
   - returns evidence for re-audit
   - never edits ASVS checklist artifacts

## Checklist Status Vocabulary

- `completed`
- `not_reviewed`
- `not_implemented`
- `needs_decision`
- `not_applicable`
- `deferred_exception`

Semantics:
- `completed` means the control is implemented and evidenced.
- `not_reviewed` means initial evidence may exist but the control has not been fully verified.
- `not_implemented` means the control remains open with no implementation evidence yet.
- `needs_decision` means the control remains open pending explicit operator/architecture decisions.
- `not_applicable` means the control does not apply to the repository as implemented and must include specific reasoning.
- `deferred_exception` means the control remains open but the operator explicitly accepted the risk. This is not equivalent to completion.

## Reasoning Requirements

Every row with status `not_reviewed`, `not_implemented`, `needs_decision`, `not_applicable`, or `deferred_exception` must include reasoning that is:

1. specific
2. evidence-based
3. non-prescriptive for the auditor

## Artifact Separation

1. ASVS artifacts are audit outputs:
   - checklist
   - findings
   - delta reports
   - audit summaries
2. Execution artifacts are planning outputs:
   - workstreams
   - slices
   - ownership maps
   - decision registers
   - campaign files
3. Code, tests, and non-ASVS docs are implementation outputs.

Never use one artifact class as the working area for another role.

## Handoff Model

1. Auditor -> Planner:
   - checklist
   - findings
   - unresolved ambiguities
   - control-family applicability notes
2. Planner -> Implementer:
   - slices
   - owned files
   - forbidden files
   - dependencies
   - required tests and docs
   - done conditions
3. Implementer -> Auditor:
   - changed files
   - tests run
   - evidence notes
   - controls claimed as ready for re-audit

## Repo Adapter Requirement

`asvs-remediate` requires a repo adapter to operate.

`asvs-review` may run in bootstrap mode without a repo adapter, but should prefer repo-configured mode when the adapter exists.
