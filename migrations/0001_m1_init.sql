CREATE TABLE probes (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  probe_number INTEGER NOT NULL,

  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expire_by TEXT NOT NULL,
  submitted_at TEXT,

  crop_name TEXT,
  crop_overridden_at TEXT,

  plant_vitality TEXT,
  soil_moisture TEXT,
  gps_lat REAL,
  gps_lon REAL,
  gps_captured_at TEXT,

  image_key TEXT,
  image_mime TEXT,
  image_bytes INTEGER,
  image_uploaded_at TEXT,

  CHECK (probe_number > 0),
  CHECK (image_bytes IS NULL OR image_bytes <= 2097152),
  UNIQUE (customer_name, order_number, probe_number)
);

CREATE INDEX idx_probes_created_at ON probes(created_at);
CREATE INDEX idx_probes_expire_by ON probes(expire_by);
CREATE INDEX idx_probes_submitted_at ON probes(submitted_at);
CREATE INDEX idx_probes_lookup_order ON probes(customer_name, order_number);
