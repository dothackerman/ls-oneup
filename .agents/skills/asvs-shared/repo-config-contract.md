# ASVS Repo Adapter Contract

Each repository that uses the reusable ASVS skills should define these files under its own tree:

1. `docs/security/asvs/repo-config.json`
2. `docs/security/asvs/surface-map.json`
3. `docs/security/asvs/execution-policy.json`

Optional:

4. `docs/security/asvs/campaigns/*.json`

## Required Files

### `repo-config.json`

Purpose:
- identifies the repository
- defines audit roots, trust boundaries, and protected artifacts
- optionally defines repository-local quality commands used during remediation validation

Minimum fields:

- `repo_name`
- `system_purpose`
- `deployment_model`
- `primary_stack`
- `code_roots`
- `docs_roots`
- `audit_artifact_root`
- `surface_map_path`
- `execution_policy_path`
- `trust_boundaries`
- `sensitive_data_classes`
- `protected_artifacts`

Optional fields:

- `commands` (for format/lint/typecheck/test commands; ASVS-specific sync/audit/gate commands are not required)

### `surface-map.json`

Purpose:
- maps architectural surfaces to current files and likely ASVS control families

Each surface should include:

- `id`
- `purpose`
- `owned_paths`
- `supporting_paths`
- `hotspot_paths`
- `likely_control_families`

### `execution-policy.json`

Purpose:
- defines concurrency and ownership rules for planner and implementer flows

Expected fields:

- `planner_requires_repo_config`
- `implementer_requires_repo_config`
- `max_parallel_audit_agents`
- `max_parallel_implementation_agents`
- `hotspot_rules`
- `slice_requirements`
- `audit_handoff_requirements`

## Planner Slice Contract

Planner outputs should use this minimum shape:

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

## Failure Policy

1. If `repo-config.json` is missing:
   - review may continue in bootstrap mode
   - remediate must stop
2. If `surface-map.json` or `execution-policy.json` is missing:
   - remediate must stop

The correct response is to ask the operator to set up the adapter or generate a template, not to improvise silently.
