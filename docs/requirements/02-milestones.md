# Shippable Prototype Milestones

## Milestone 1: Probe Context Capture MVP

### Goal
Ship a minimal workflow where admin can create probe-specific links and farmers can submit required context data per probe.

### Scope
1. Admin setup
   - Admin enters `customer_name`, `order_number`, and `probe_count`.
   - System creates probes with `probe_number` from `1..N`.
   - One one-time link + one QR code is generated per probe.
   - Probe identity is fixed as `customer_name + order_number + probe_number`.
2. Link lifecycle
   - Link is valid for 60 days (`expire_by = created_at + 60 days`) if unused.
   - First successful submit invalidates the link immediately.
   - Optimistic concurrency applies: first successful submit wins; later submit attempts are rejected.
3. Farmer form (German UI)
   - `crop_name` (mandatory free text)
   - `plant_vitality` dropdown with fixed values:
     - `normal`
     - `schwach / langsam`
     - `krankheit oder anderes problem`
   - `soil_moisture` dropdown with fixed values:
     - `sehr trocken`
     - `trocken`
     - `normal`
     - `nass`
     - `sehr nass`
   - Mandatory GPS capture (`lat`, `lon`, `gps_captured_at`)
   - Exactly one mandatory image (`jpg/png`, max 2 MB after client-side compression if the selected tech stack supports it)
4. Farmer input handling
   - M1 is online-only: form load and submit require internet connection.
   - Offline usage is out of scope in M1.
   - No cross-device draft synchronization in M1.
5. Admin view and correction
   - Admin table includes at least: `created_at`, `expire_by`, status.
   - Status set in M1: `offen`, `eingereicht`, `abgelaufen`.
   - Admin can override `crop_name` only.
   - On override, keep final crop value and store `crop_overridden_at`.
   - UI must make it clear that admin takes responsibility when overriding crop.

### Shippable Output
Admin can issue probe-specific links/QRs and receive complete per-probe context submissions from farmers.

### Acceptance Criteria
1. Admin can create probes and links for one order in a single flow.
2. Each probe has exactly one active link in M1.
3. Form submission is blocked unless mandatory fields are present, including GPS and exactly one image.
4. Submitted probes are visible in admin table with status `eingereicht`.
5. Unused links transition to `abgelaufen` after 60 days.
6. A used link cannot be submitted again.
7. If no internet connection is available, form load/submit is not possible in M1.

### Out of Scope
1. Regenerate/revoke links.
2. BBCH capture.
3. Model-based BBCH prediction.
4. Lab Excel integration/export features.

---

## Milestone 2: Whole-Plant Image + Manual BBCH

### Goal
Extend probe capture and admin workflow so BBCH can be assigned manually from standardized whole-plant images.

### Scope
1. Image model changes
   - Whole-plant image is mandatory.
   - Leaf close-up image is optional.
   - Whole-plant photo must use provided white A3 paper with scale as background.
2. BBCH capture
   - Admin records BBCH manually from images.
   - BBCH may be stored as exact stage or range.
   - Optional admin comment for BBCH decision.
3. Data model baseline
   - BBCH modeling follows publication: `https://doi.org/10.5073/20180906-075119`.
4. Optional scope candidate (not planned by default)
   - Revoke/regenerate link support can be added if needed.
   - If added, TTL is recalculated from regeneration timestamp.

### Shippable Output
Admin can enrich submitted probe records with standardized image context and manual BBCH.

### Acceptance Criteria
1. Whole-plant image is enforced for new submissions.
2. Admin can assign BBCH (exact or range) and optionally add comment.
3. BBCH-related data fields align with the referenced publication model.

### Out of Scope
1. Automatic BBCH prediction by model.

---

## Milestone 3: Model-Assisted BBCH

### Goal
Use model output to prefill BBCH while keeping admin in control.

### Scope
1. Model predicts BBCH from whole-plant image.
2. Admin can override predicted BBCH.
3. Final decision and edge-case behavior (for example low-confidence handling) are defined during M2/M3 planning.

### Shippable Output
Admin gets BBCH decision support and retains final authority over stored BBCH.

### Acceptance Criteria
1. For eligible submissions, system provides a BBCH proposal.
2. Admin override path is always available.
3. Stored BBCH reflects admin-confirmed final value.

---

## Cross-Milestone Non-Functional Requirements
1. Prototype-first approach: simple implementation over completeness.
2. Mobile-first farmer flow.
3. Auditable timestamps for key events:
   - `created_at`
   - `expire_by`
   - `gps_captured_at`
   - `crop_overridden_at` (when applicable)
4. UI language is German.
