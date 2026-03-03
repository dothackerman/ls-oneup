import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import type { APIRequestContext } from "@playwright/test";

const execFileAsync = promisify(execFile);

type CreateProbeResponse = {
  items: Array<{ probe_id: string; token_url: string }>;
};

type ImagePayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

export type MultipartSubmitPayload = {
  crop_name: string;
  vitality: string;
  soil_moisture: string;
  gps_lat: string;
  gps_lon: string;
  gps_captured_at: string;
  image: ImagePayload;
};

export async function createProbeOrder(
  request: APIRequestContext,
  options?: {
    customerName?: string;
    orderPrefix?: string;
    probeCount?: number;
  },
): Promise<{ orderNumber: string; probeId: string; token: string; tokenUrl: string }> {
  const orderNumber = `${options?.orderPrefix ?? "E2E"}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const response = await request.post("/api/admin/probes", {
    data: {
      customer_name: options?.customerName ?? "E2E Kunde",
      order_number: orderNumber,
      probe_count: options?.probeCount ?? 1,
    },
  });

  if (response.status() !== 201) {
    throw new Error(`Probe creation failed with status ${response.status()}`);
  }

  const payload = (await response.json()) as CreateProbeResponse;
  const firstItem = payload.items?.[0];
  if (!firstItem) {
    throw new Error("Probe creation returned no items.");
  }

  return {
    orderNumber,
    probeId: firstItem.probe_id,
    tokenUrl: firstItem.token_url,
    token: tokenFromUrl(firstItem.token_url),
  };
}

export function tokenFromUrl(tokenUrl: string): string {
  const token = tokenUrl.split("/").pop();
  if (!token) {
    throw new Error("Token missing in URL.");
  }
  return token;
}

export function buildMultipartSubmitPayload(overrides?: {
  crop_name?: string;
  vitality?: string;
  soil_moisture?: string;
  gps_lat?: string;
  gps_lon?: string;
  gps_captured_at?: string;
  image?: ImagePayload;
}): MultipartSubmitPayload {
  return {
    crop_name: overrides?.crop_name ?? "Kartoffeln",
    vitality: overrides?.vitality ?? "normal",
    soil_moisture: overrides?.soil_moisture ?? "normal",
    gps_lat: overrides?.gps_lat ?? "47.3769",
    gps_lon: overrides?.gps_lon ?? "8.5417",
    gps_captured_at: overrides?.gps_captured_at ?? new Date().toISOString(),
    image: overrides?.image ?? {
      name: "probe.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(1024, 1),
    },
  };
}

export async function submitProbe(
  request: APIRequestContext,
  token: string,
  payload?: Parameters<typeof buildMultipartSubmitPayload>[0],
): Promise<number> {
  const response = await request.post(`/api/probe/${token}/submit`, {
    multipart: buildMultipartSubmitPayload(payload),
  });
  return response.status();
}

export async function expireProbeById(probeId: string): Promise<void> {
  const sql = `UPDATE probes SET expire_by = '2000-01-01T00:00:00.000Z' WHERE id = '${probeId}';`;

  try {
    await execFileAsync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "ls-oneup-db",
        "--local",
        "--config",
        "wrangler.jsonc",
        "--command",
        sql,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          XDG_CONFIG_HOME: ".wrangler-config",
        },
      },
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Failed to expire probe via local D1 SQL: ${details}`);
  }
}
