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
  submission_ciphertext: string | null;
};

export type ProbeTokenState = {
  id: string;
  customer_name: string;
  order_number: string;
  probe_number: number;
  expire_by: string;
  submitted_at: string | null;
  token_hash: string;
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
      image_key,
      submission_ciphertext
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
      submission_ciphertext: string | null;
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
    submission_ciphertext: row.submission_ciphertext,
  }));

  if (filters.status) {
    return items.filter((item) => item.status === filters.status);
  }

  return items;
}

function placeholders(startIndex: number, count: number): string {
  return Array.from({ length: count }, (_, index) => `?${startIndex + index}`).join(", ");
}

export async function findByTokenHashes(
  db: D1Database,
  tokenHashes: string[],
): Promise<ProbeTokenState | null> {
  if (tokenHashes.length === 0) {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT id, customer_name, order_number, probe_number, expire_by, submitted_at, token_hash
       FROM probes
       WHERE token_hash IN (${placeholders(1, tokenHashes.length)})
       LIMIT 1`,
    )
    .bind(...tokenHashes)
    .first<ProbeTokenState>();

  return row ?? null;
}

export async function applySubmit(
  db: D1Database,
  payload: {
    token_hash: string;
    now_iso: string;
    submission_ciphertext: string;
    image_mime: string;
    image_bytes: number;
    image_uploaded_at: string;
  },
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE probes
       SET submitted_at = ?1,
           submission_ciphertext = ?2,
           crop_name = NULL,
           plant_vitality = NULL,
           soil_moisture = NULL,
           gps_lat = NULL,
           gps_lon = NULL,
           gps_captured_at = NULL,
           image_key = NULL,
           image_mime = ?3,
           image_bytes = ?4,
           image_uploaded_at = ?5
       WHERE token_hash = ?6
         AND submitted_at IS NULL
         AND expire_by > ?7`,
    )
    .bind(
      payload.now_iso,
      payload.submission_ciphertext,
      payload.image_mime,
      payload.image_bytes,
      payload.image_uploaded_at,
      payload.token_hash,
      payload.now_iso,
    )
    .run();

  return result.meta.changes ?? 0;
}

export type OverrideCropResult = "updated" | "not_found" | "not_submitted";

export type ProbeSubmissionRecord = {
  id: string;
  submitted_at: string | null;
  crop_name: string | null;
  plant_vitality: Vitality | null;
  soil_moisture: SoilMoisture | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_captured_at: string | null;
  crop_overridden_at: string | null;
  image_key: string | null;
  image_mime: string | null;
  image_bytes: number | null;
  image_uploaded_at: string | null;
  submission_ciphertext: string | null;
};

export async function overrideCrop(
  db: D1Database,
  probeId: string,
  cropName: string,
  nowIso: string,
): Promise<OverrideCropResult> {
  const result = await db
    .prepare(
      "UPDATE probes SET crop_name = ?1, crop_overridden_at = ?2 WHERE id = ?3 AND submitted_at IS NOT NULL",
    )
    .bind(cropName, nowIso, probeId)
    .run();

  if ((result.meta.changes ?? 0) > 0) {
    return "updated";
  }

  const row = await db
    .prepare("SELECT submitted_at FROM probes WHERE id = ?1")
    .bind(probeId)
    .first<{ submitted_at: string | null }>();

  if (!row) {
    return "not_found";
  }

  return "not_submitted";
}

export async function getProbeSubmission(
  db: D1Database,
  probeId: string,
): Promise<ProbeSubmissionRecord | null> {
  const row = await db
    .prepare(
      `SELECT id,
              submitted_at,
              crop_name,
              plant_vitality,
              soil_moisture,
              gps_lat,
              gps_lon,
              gps_captured_at,
              crop_overridden_at,
              image_key,
              image_mime,
              image_bytes,
              image_uploaded_at,
              submission_ciphertext
         FROM probes
        WHERE id = ?1`,
    )
    .bind(probeId)
    .first<ProbeSubmissionRecord>();

  return row ?? null;
}

export async function overrideEncryptedSubmission(
  db: D1Database,
  probeId: string,
  submissionCiphertext: string,
  nowIso: string,
): Promise<OverrideCropResult> {
  const result = await db
    .prepare(
      `UPDATE probes
          SET submission_ciphertext = ?1,
              crop_overridden_at = ?2,
              crop_name = NULL
        WHERE id = ?3
          AND submitted_at IS NOT NULL`,
    )
    .bind(submissionCiphertext, nowIso, probeId)
    .run();

  if ((result.meta.changes ?? 0) > 0) {
    return "updated";
  }

  const row = await db
    .prepare("SELECT submitted_at FROM probes WHERE id = ?1")
    .bind(probeId)
    .first<{ submitted_at: string | null }>();

  if (!row) {
    return "not_found";
  }

  return "not_submitted";
}

export async function getProbeImage(
  db: D1Database,
  probeId: string,
): Promise<{
  image_key: string | null;
  image_mime: string | null;
  submission_ciphertext: string | null;
} | null> {
  const row = await db
    .prepare("SELECT image_key, image_mime, submission_ciphertext FROM probes WHERE id = ?1")
    .bind(probeId)
    .first<{
      image_key: string | null;
      image_mime: string | null;
      submission_ciphertext: string | null;
    }>();

  return row ?? null;
}
