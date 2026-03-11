# Backend Change Checklist

## When To Use
Use for Worker/runtime/API behavior changes.

## Must Pass
1. API behavior aligns with contract docs.
2. Data validation/security rules remain intact.
3. Error/status code semantics are preserved or documented.

## Evidence Required
1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:integration`
5. `npm run test:e2e` (if user-visible flow impacted)
