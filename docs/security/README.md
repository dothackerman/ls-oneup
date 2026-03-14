# Security Documentation Index

Use this folder as the main entry point for repository security documentation.

## Start Here

1. [Security decision record](../requirements/12-m1-security-decision-record.md)
2. [ASVS audit contract](../requirements/13-m1-asvs-audit-agent-and-checklist.md)
3. [ASVS / vOS checklist pipeline](./asvs/README.md)
4. [Human-readable ASVS checklist](./asvs/checklist.human.md)
5. [Machine-readable ASVS checklist](./asvs/checklist.machine.json)
6. [ASVS delta summary](./asvs/checklist.delta.md)
7. [Crypto inventory pipeline](./crypto/README.md)
8. [Crypto inventory](./crypto-inventory.json)
9. [Crypto policy](./crypto-policy.md)

## Navigation Notes

- Start with the decision record when you want the current application security posture and design tradeoffs.
- Start with the ASVS human checklist when you want the current audit result without parsing JSON.
- Use the ASVS machine checklist and findings files when you need structured status, reasoning, or automation hooks.
- Use the crypto inventory and policy when you want implementation-level cryptography scope, key handling, and rotation rules.
