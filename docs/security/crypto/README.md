# Crypto Inventory Pipeline

This directory tracks the repository's cryptographic inventory, discovery output, and operating policy.

## Recommended Entry Points

1. [Security documentation index](../README.md)
2. [Security decision record](../../requirements/12-m1-security-decision-record.md)
3. [ASVS / vOS checklist pipeline](../asvs/README.md)

## Files

- `../crypto-inventory.json` - maintained inventory of active cryptographic primitives, key sources, rotation rules, and migration plans.
- `../crypto-discovery.json` - generated discovery artifact showing crypto-related code and operational references found in the repository.
- `../crypto-policy.md` - key-management, crypto-agility, and fail-secure policy for the M1 runtime.

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
