# M1 Data Model and Migration Plan

## Purpose
Define the baseline D1 schema and migration rules for M1.

## Storage Model
1. D1 stores probe state and metadata.
2. R2 stores image binary objects.
3. D1 references R2 objects via key and metadata fields.

## Core Table: `probes`

```sql
CREATE TABLE probes (
  id TEXT PRIMARY KEY,                         -- UUID
  customer_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  probe_number INTEGER NOT NULL,

  token_hash TEXT NOT NULL UNIQUE,             -- see security ADR
  created_at TEXT NOT NULL,                    -- ISO UTC
  expire_by TEXT NOT NULL,                     -- created_at + 60 days
  submitted_at TEXT,                           -- null until accepted submit

  crop_name TEXT,                              -- final value (farmer or admin override)
  crop_overridden_at TEXT,                     -- null if never overridden

  plant_vitality TEXT,                         -- enum-like text
  soil_moisture TEXT,                          -- enum-like text
  gps_lat REAL,
  gps_lon REAL,
  gps_captured_at TEXT,

  image_key TEXT,                              -- R2 object key
  image_mime TEXT,
  image_bytes INTEGER,
  image_uploaded_at TEXT,

  CHECK (probe_number > 0),
  CHECK (image_bytes IS NULL OR image_bytes <= 2097152),
  UNIQUE (customer_name, order_number, probe_number)
);
```

## Indexes

```sql
CREATE INDEX idx_probes_created_at ON probes(created_at);
CREATE INDEX idx_probes_expire_by ON probes(expire_by);
CREATE INDEX idx_probes_submitted_at ON probes(submitted_at);
CREATE INDEX idx_probes_lookup_order ON probes(customer_name, order_number);
```

## Allowed Value Contracts
Application-level validation enforces:
1. `plant_vitality`:
   - `normal`
   - `schwach_langsam`
   - `krankheit_oder_anderes_problem`
2. `soil_moisture`:
   - `sehr_trocken`
   - `trocken`
   - `normal`
   - `nass`
   - `sehr_nass`
3. `image_mime`:
   - `image/jpeg`
   - `image/png`

## Submission Write Contract
1. Write image to R2 first.
2. Run one conditional D1 update for submit acceptance:
   - token hash matches
   - `submitted_at IS NULL`
   - `expire_by > now`
3. If conditional update affects 0 rows:
   - treat as `expired` or `already used`
   - perform best-effort R2 delete for uploaded orphan object
   - log cleanup outcome

## Migration Rules
1. Migrations are append-only and sequential.
2. No rewrite of prior migration files after merge.
3. Schema changes must include backward-safe rollout notes.
4. Every migration change requires matching integration tests.

## Versioning Notes
1. M1 schema is `v1`.
2. M2 additions (whole-plant + optional leaf + BBCH) must be introduced via additive migrations.
3. No destructive migration in active prototype phase unless explicitly approved.
