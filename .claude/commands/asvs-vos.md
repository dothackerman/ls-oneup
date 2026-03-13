# /asvs-vos

Run the ASVS/vOS recurring audit workflow for this repository.

## Responsibility note

This command may be executed with any available model. The repository owner is responsible for evaluating whether the resulting findings are sufficient for the intended security decision.

## Execution

1. Read:
   - `.agents/skills/asvs-vos/SKILL.md`
   - `.claude/agents/asvs-vos-auditor.md`
2. Run:

```bash
npm run asvs:run
```

3. Report the gate summary output directly (the gate script emits a structured summary block — no manual JSON parsing needed).
4. If gate fails, report exact failure and stop.
5. If gate passes, proceed with agent triage of remaining `todo` items per SKILL.md instructions.

## Output artifacts

- `docs/security/asvs/source-state.json`
- `docs/security/asvs/version-history.jsonl`
- `docs/security/asvs/checklist.machine.json`
- `docs/security/asvs/checklist.human.md`
- `docs/security/asvs/checklist.findings.jsonl`
- `docs/security/asvs/checklist.delta.json`
- `docs/security/asvs/checklist.delta.md`
