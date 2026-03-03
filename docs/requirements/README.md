# Requirements Documentation Index

This folder contains the living requirement and implementation-guidance documents for `ls-oneup`.

## Document Order
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

## Working Rules
1. Keep docs aligned with code and architecture decisions.
2. Keep milestones shippable and explicitly testable.
3. Treat open questions as backlog items, not hidden assumptions.
