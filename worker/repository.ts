import type { ProbeStatus, SoilMoisture, Vitality } from "../src/shared/domain";
import { deriveStatus } from "../src/shared/domain";

export type ProbeListItem = {
  probe_id: string;
  customer_name: string;
  order_number: string;
  probe_number: number;
  status: ProbeStatus;
  created_at: string;
  expire_by: string;
  submitted_at: string | null;
  crop_name: string | null;
  plant_vitality: Vitality | null;
  soil_moisture: SoilMoisture | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_captured_at: string | null;
  crop_overridden_at: string | null;
  image_key: string | null;
};

export type ProbeTokenState = {
  id: string;
  customer_name: string;
  order_number: string;
  probe_number: number;
  expire_by: string;
  submitted_at: string | null;
};

export async function orderExists(
  db: D1Database,
  customerName: string,
  orderNumber: string,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM probes WHERE customer_name = ?1 AND order_number = ?2")
    .bind(customerName, orderNumber)
    .first<{ count: number }>();

  return Number(row?.count ?? 0) > 0;
}

export async function insertProbe(
  db: D1Database,
  payload: {
    id: string;
    customer_name: string;
    order_number: string;
    probe_number: number;
    token_hash: string;
    created_at: string;
    expire_by: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO probes (
        id, customer_name, order_number, probe_number, token_hash, created_at, expire_by
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      payload.id,
      payload.customer_name,
      payload.order_number,
      payload.probe_number,
      payload.token_hash,
      payload.created_at,
      payload.expire_by,
    )
    .run();
}

export async function listProbes(
  db: D1Database,
  filters: { customer_name?: string; order_number?: string; status?: ProbeStatus },
  nowIso: string,
): Promise<ProbeListItem[]> {
  const where: string[] = [];
  const binds: Array<string | number> = [];

  if (filters.customer_name) {
    where.push(`customer_name = ?${binds.length + 1}`);
    binds.push(filters.customer_name);
  }
  if (filters.order_number) {
    where.push(`order_number = ?${binds.length + 1}`);
    binds.push(filters.order_number);
  }

  const sql = `SELECT
      id,
      customer_name,
      order_number,
      probe_number,
      created_at,
      expire_by,
      submitted_at,
      crop_name,
      plant_vitality,
      soil_moisture,
      gps_lat,
      gps_lon,
      gps_captured_at,
      crop_overridden_at,
      image_key
    FROM probes
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC, probe_number ASC`;

  const rows = await db
    .prepare(sql)
    .bind(...binds)
    .all<{
      id: string;
      customer_name: string;
      order_number: string;
      probe_number: number;
      created_at: string;
      expire_by: string;
      submitted_at: string | null;
      crop_name: string | null;
      plant_vitality: Vitality | null;
      soil_moisture: SoilMoisture | null;
      gps_lat: number | null;
      gps_lon: number | null;
      gps_captured_at: string | null;
      crop_overridden_at: string | null;
      image_key: string | null;
    }>();

  const items = (rows.results ?? []).map((row) => ({
    probe_id: row.id,
    customer_name: row.customer_name,
    order_number: row.order_number,
    probe_number: row.probe_number,
    status: deriveStatus(row.submitted_at, row.expire_by, nowIso),
    created_at: row.created_at,
    expire_by: row.expire_by,
    submitted_at: row.submitted_at,
    crop_name: row.crop_name,
    plant_vitality: row.plant_vitality,
    soil_moisture: row.soil_moisture,
    gps_lat: row.gps_lat,
    gps_lon: row.gps_lon,
    gps_captured_at: row.gps_captured_at,
    crop_overridden_at: row.crop_overridden_at,
    image_key: row.image_key,
  }));

  if (filters.status) {
    return items.filter((item) => item.status === filters.status);
  }

  return items;
}

export async function findByTokenHash(
  db: D1Database,
  tokenHash: string,
): Promise<ProbeTokenState | null> {
  const row = await db
    .prepare(
      `SELECT id, customer_name, order_number, probe_number, expire_by, submitted_at
       FROM probes
       WHERE token_hash = ?1`,
    )
    .bind(tokenHash)
    .first<ProbeTokenState>();

  return row ?? null;
}

export async function applySubmit(
  db: D1Database,
  payload: {
    token_hash: string;
    now_iso: string;
    crop_name: string;
    plant_vitality: Vitality;
    soil_moisture: SoilMoisture;
    gps_lat: number;
    gps_lon: number;
    gps_captured_at: string;
    image_key: string;
    image_mime: string;
    image_bytes: number;
    image_uploaded_at: string;
  },
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE probes
       SET submitted_at = ?1,
           crop_name = ?2,
           plant_vitality = ?3,
           soil_moisture = ?4,
           gps_lat = ?5,
           gps_lon = ?6,
           gps_captured_at = ?7,
           image_key = ?8,
           image_mime = ?9,
           image_bytes = ?10,
           image_uploaded_at = ?11
       WHERE token_hash = ?12
         AND submitted_at IS NULL
         AND expire_by > ?13`,
    )
    .bind(
      payload.now_iso,
      payload.crop_name,
      payload.plant_vitality,
      payload.soil_moisture,
      payload.gps_lat,
      payload.gps_lon,
      payload.gps_captured_at,
      payload.image_key,
      payload.image_mime,
      payload.image_bytes,
      payload.image_uploaded_at,
      payload.token_hash,
      payload.now_iso,
    )
    .run();

  return result.meta.changes ?? 0;
}

export async function overrideCrop(
  db: D1Database,
  probeId: string,
  cropName: string,
  nowIso: string,
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE probes SET crop_name = ?1, crop_overridden_at = ?2 WHERE id = ?3")
    .bind(cropName, nowIso, probeId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function getProbeImage(
  db: D1Database,
  probeId: string,
): Promise<{ image_key: string | null; image_mime: string | null } | null> {
  const row = await db
    .prepare("SELECT image_key, image_mime FROM probes WHERE id = ?1")
    .bind(probeId)
    .first<{ image_key: string | null; image_mime: string | null }>();

  return row ?? null;
}
