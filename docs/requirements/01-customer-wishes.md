# Customer Wishes (Clarified)

## Problem to Solve
When a customer submits leaf sap analysis probes, interpretation quality drops if contextual probe data is missing.

## Desired Outcome
Per probe, collect simple field data in a fast workflow so admin can interpret and manage probe context consistently.

## Business Context
1. One customer can place multiple orders over time.
2. One order can include multiple probes.
3. Probe context collection must therefore be linked to:
   - customer
   - order number
   - probe number (starting at 1)

## Confirmed Product Direction
1. Rapid prototype first, strict YAGNI scope.
2. Every milestone must be shippable by itself.
3. UI language is Swiss Standard German (`de-CH`).

## Confirmed M1 Wishes
1. Admin enters:
   - customer name
   - order number
   - number of probes
2. System generates one one-time link + QR code per probe.
3. Link access alone is enough (no extra login).
4. Link expires after 60 days if unused.
5. On successful submit, link is disabled immediately.
6. Farmer form contains:
   - crop name (mandatory free text)
   - plant vitality (dropdown: `normal`, `schwach / langsam`, `krankheit oder anderes problem`)
   - soil moisture (dropdown: `sehr trocken`, `trocken`, `normal`, `nass`, `sehr nass`)
   - GPS capture mandatory (`lat/lon` + capture timestamp)
   - exactly one mandatory image (`jpg/png`, max 2 MB after client-side compression if supported by chosen tech stack)
   - online-only behavior in M1 (form load and submit require internet connection; no offline capability)
7. Admin can view submitted probe data.
8. Admin can override crop name only.
9. Overridden crop keeps final value only and stores `crop_overridden_at`.

## Confirmed M2 and M3 Direction
1. M2:
   - whole-plant image becomes mandatory
   - leaf image becomes optional
   - whole-plant image uses provided white A3 sheet with scale
   - admin manually records BBCH (exact value or range) with optional comment
2. M3:
   - model proposes BBCH
   - admin can override
