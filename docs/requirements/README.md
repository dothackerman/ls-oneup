# Requirements Documentation Index

This folder contains the living requirement and implementation-guidance documents for `ls-oneup`.

For audience-based navigation across all docs, start at `../README.md`.

## Document Order
0. `00-index.md`
   - quick-start index with conditional loading guidance for agents
1. `01-customer-wishes.md`
   - clarified customer wishes and product intent
2. `02-milestones.md`
   - shippable milestone definitions and acceptance criteria
3. `03-open-questions.md`
   - unresolved questions and deferred decisions
4. `04-tech-stack-decision-memo.md`
   - deployment-stack decision memo (Cloudflare selected)
5. `05-agent-tooling-and-local-flow.md`
   - agent tooling setup and local-first workflow boundaries
6. `06-application-tech-stack-memo.md`
   - selected application stack on Cloudflare
7. `07-m1-agent-execution-contract.md`
   - M1 implementation contract for agent/subagent execution
8. `08-local-testing-and-first-release-runbook.md`
   - local testing getting-started + proposed first Cloudflare release steps
9. `09-m1-api-contract.md`
   - endpoint contract, payloads, and status/error behavior for M1
10. `10-m1-data-model-and-migrations.md`
   - D1 schema baseline, R2 reference model, and migration rules
11. `11-m1-test-traceability-matrix.md`
   - mapping from M1 acceptance criteria to integration/E2E tests
12. `12-m1-security-decision-record.md`
   - ADR-style security decision for one-time token links
13. `13-m1-asvs-audit-agent-and-checklist.md`
   - ASVS/vOS audit agent contract, source sync, and checklist workflow
   - generated checklist artifacts live under `../security/asvs/`
14. `14-frontend-styling-policy.md`
   - frontend styling rules for shadcn base components, Tailwind composition, and runtime-style exceptions
15. `15-ux-governance.md`
   - operator-grade UX principles and validation contract
16. `16-onboarding-parity.md`
   - onboarding parity rules to avoid preview/production drift

## Working Rules
1. Keep docs aligned with code and architecture decisions.
2. Keep milestones shippable and explicitly testable.
3. Treat open questions as backlog items, not hidden assumptions.

## Related Navigation
1. Security hub: `../security/README.md`
2. Human-readable ASVS checklist: `../security/asvs/checklist.human.md`
3. ASVS maintenance artifacts: `../security/asvs/README.md`
