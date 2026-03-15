# M1 API Contract

## Purpose
Define the exact HTTP contract for Milestone 1.

## Conventions
1. This contract defines API behavior under `/api/*` (JSON responses) and required UI page routes (HTML/app shell responses).
2. Timestamps use ISO 8601 UTC strings.
3. Error payload shape:
```json
{
  "error_code": "string",
  "message": "string"
}
```
4. Admin endpoints are protected by Cloudflare Access.
5. Public token endpoints require possession of valid link token.
6. Dynamic admin and token JSON or image responses must return anti-caching headers:
   - `cache-control: no-store`
   - `pragma: no-cache`
   - `expires: 0`
   - admin responses also include `vary: Cf-Access-Authenticated-User-Email`

## Domain Types
1. `vitality`: `normal | schwach_langsam | krankheit_oder_anderes_problem`
2. `soil_moisture`: `sehr_trocken | trocken | normal | nass | sehr_nass`
3. `status`: `offen | eingereicht | abgelaufen`

## Endpoints

## UI Routes (HTML/App Shell)

### `GET /admin`
Serve admin UI entry route (Cloudflare Access protected).

### `GET /admin/*`
Serve admin UI subroutes (Cloudflare Access protected).

### `GET /p/:token`
Serve farmer UI entry route.

Success:
1. `200` HTML/app shell content if link can be resolved.
2. Expired/used states may still return HTML/app shell with blocked submit message.

## API Routes (JSON)

### `POST /api/admin/probes`
Create probe entries and one-time links for an order.

Request:
```json
{
  "customer_name": "string",
  "order_number": "string",
  "probe_count": 3
}
```

Validation:
1. `customer_name` non-empty.
2. `order_number` non-empty.
3. `probe_count` integer >= 1.

Success `201`:
```json
{
  "items": [
    {
      "probe_id": "uuid",
      "probe_number": 1,
      "token_url": "https://<host>/p/<token>",
      "created_at": "2026-03-03T10:00:00Z",
      "expire_by": "2026-05-02T10:00:00Z"
    }
  ]
}
```

Response headers:
1. `cache-control: no-store`
2. `pragma: no-cache`
3. `expires: 0`
4. `vary: Cf-Access-Authenticated-User-Email`

Errors:
1. `400` validation failure.
2. `409` duplicate `(customer_name, order_number, probe_number)` conflict.

### `GET /api/admin/probes`
List probes for admin table.

Query params (optional):
1. `customer_name`
2. `order_number`
3. `status`

Success `200`:
```json
{
  "items": [
    {
      "probe_id": "uuid",
      "customer_name": "string",
      "order_number": "string",
      "probe_number": 1,
      "status": "offen",
      "created_at": "2026-03-03T10:00:00Z",
      "expire_by": "2026-05-02T10:00:00Z",
      "submitted_at": null,
      "crop_name": null,
      "plant_vitality": null,
      "soil_moisture": null,
      "gps_lat": null,
      "gps_lon": null,
      "gps_captured_at": null,
      "crop_overridden_at": null,
      "image_url": null
    }
  ]
}
```

Response headers:
1. `cache-control: no-store`
2. `pragma: no-cache`
3. `expires: 0`
4. `vary: Cf-Access-Authenticated-User-Email`

### `PATCH /api/admin/probes/:id/crop-override`
Set admin crop override.

Request:
```json
{
  "crop_name": "Kartoffeln"
}
```

Validation:
1. `crop_name` non-empty.

Success `200`:
```json
{
  "probe_id": "uuid",
  "crop_name": "Kartoffeln",
  "crop_overridden_at": "2026-03-03T11:00:00Z"
}
```

Response headers:
1. `cache-control: no-store`
2. `pragma: no-cache`
3. `expires: 0`
4. `vary: Cf-Access-Authenticated-User-Email`

Errors:
1. `404` probe not found.
2. `400` validation failure.
3. `409` probe is not submitted yet (`PROBE_NOT_SUBMITTED`).

### `GET /api/admin/probes/:id/image`
Open uploaded probe image via stored D1 reference to R2 object.

Success:
1. `200` image body with inline rendering headers.

Response headers:
1. `content-type` from R2 metadata; if missing, fallback to D1 `image_mime`.
2. `content-disposition: inline`.
3. `cache-control: no-store`.
4. `pragma: no-cache`.
5. `expires: 0`.
6. `vary: Cf-Access-Authenticated-User-Email`.

Errors:
1. `404` image reference missing in D1.
2. `404` object missing in R2.

### `GET /api/probe/:token`
Resolve token for farmer form initialization.

Success `200`:
```json
{
  "token_state": "open",
  "customer_name": "string",
  "order_number": "string",
  "probe_number": 1
}
```

Response headers:
1. `cache-control: no-store`
2. `pragma: no-cache`
3. `expires: 0`

Blocked states:
1. `410` expired token:
```json
{
  "error_code": "TOKEN_EXPIRED",
  "message": "Link ist abgelaufen."
}
```
2. `409` already used token:
```json
{
  "error_code": "TOKEN_ALREADY_USED",
  "message": "Link wurde bereits verwendet."
}
```
3. `404` token not found.

### `POST /api/probe/:token/submit`
Submit farmer data with exactly one image.

Content type:
1. `multipart/form-data`

Required fields:
1. `crop_name` (text)
2. `vitality` (enum)
3. `soil_moisture` (enum)
4. `gps_lat` (number)
5. `gps_lon` (number)
6. `gps_captured_at` (ISO timestamp)
7. `image` (single file, `image/jpeg` or `image/png`, max 2 MB)

Success `201`:
```json
{
  "probe_id": "uuid",
  "submitted_at": "2026-03-03T11:30:00Z",
  "status": "eingereicht"
}
```

Response headers:
1. `cache-control: no-store`
2. `pragma: no-cache`
3. `expires: 0`

Errors:
1. `400` invalid payload / missing fields.
2. `415` invalid MIME type.
3. `413` file too large.
4. `410` token expired.
5. `409` token already used (first-submit-wins).
6. `404` token not found.
7. `503` storage write failure.

## Status Derivation Rules
1. `eingereicht`: `submitted_at IS NOT NULL`
2. `abgelaufen`: `submitted_at IS NULL AND now > expire_by`
3. `offen`: otherwise

## Notes
1. Token security details are defined in `12-m1-security-decision-record.md`.
2. Schema field mapping is defined in `10-m1-data-model-and-migrations.md`.
