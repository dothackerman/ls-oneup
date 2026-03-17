# Documentation Hub

Use this page as the primary navigation entrypoint for repository documentation.

## 1) Contributors (daily development)

Start here if you are implementing and validating changes locally.

1. [Local development guide](./maintainers/local-development.md)
2. [Local testing and first release runbook](./requirements/08-local-testing-and-first-release-runbook.md)
3. [Requirements index](./requirements/README.md)

## 2) Maintainers and operators (release + production)

Use this lane for production environment setup, guarded releases, and operational controls.

1. [Production release setup](./maintainers/production-release.md)
2. [Security documentation index](./security/README.md)
3. [M1 security decision record](./requirements/12-m1-security-decision-record.md)

## 3) Product and contract references

Use this lane for milestone scope, API behavior, and data contracts.

1. [Milestones and acceptance criteria](./requirements/02-milestones.md)
2. [M1 API contract](./requirements/09-m1-api-contract.md)
3. [M1 data model and migrations](./requirements/10-m1-data-model-and-migrations.md)
4. [M1 test traceability matrix](./requirements/11-m1-test-traceability-matrix.md)

## 4) Security and audit references

1. [Security documentation index](./security/README.md)
2. [ASVS audit contract and checklist process](./requirements/13-m1-asvs-audit-agent-and-checklist.md)
3. [Crypto policy](./security/crypto-policy.md)

## Notes

- `README.md` stays public-facing and concise.
- Maintainer-heavy operational content lives under `docs/maintainers/`.
- Requirement docs remain under `docs/requirements/` as the source of truth for contracts and milestone scope.
