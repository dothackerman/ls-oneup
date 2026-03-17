# Crypto Inventory Pipeline

This directory tracks the repository's cryptographic inventory, discovery output, and operating policy.
This README is maintenance-oriented. Start with [security index](../README.md) or [crypto policy](../crypto-policy.md).

## Recommended Entry Points

1. [Security documentation index](../README.md)
2. [Security decision record](../../requirements/12-m1-security-decision-record.md)
3. [ASVS / vOS checklist pipeline](../asvs/README.md)

## Files

- [docs/security/crypto-inventory.json](../crypto-inventory.json) - maintained inventory of active cryptographic primitives, key sources, rotation rules, and migration plans.
- [docs/security/crypto-discovery.json](../crypto-discovery.json) - generated discovery artifact showing crypto-related code and operational references found in the repository.
- [docs/security/crypto-policy.md](../crypto-policy.md) - key-management, crypto-agility, and fail-secure policy for the M1 runtime.

## Workflow

1. Refresh discovery output:

```bash
npm run crypto:audit
```

2. Enforce inventory coverage and metadata quality:

```bash
npm run crypto:gate
```

3. Run both:

```bash
npm run crypto:run
```

## Responsibility Note

The inventory is the source of truth for current cryptographic use in this repository.
The discovery output is generated evidence.
The gate exists to stop uncatalogued crypto from quietly appearing in production code.
