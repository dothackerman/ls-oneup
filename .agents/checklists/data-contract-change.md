# Data/Contract Change Checklist

## When To Use
Use for API payload/schema/migration/contract updates.

## Must Pass
1. Contract docs updated in same slice.
2. Migration/data-model docs aligned with code.
3. Test traceability references still valid.

## Evidence Required
1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:integration`
5. `npm run test:e2e` (if API changes surface in UI flow)
