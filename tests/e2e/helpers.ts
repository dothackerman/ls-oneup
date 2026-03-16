import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";
import type { APIRequestContext } from "@playwright/test";

const execFileAsync = promisify(execFile);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

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

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < input.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ input[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([length, payload, crc]);
}

function buildSolidPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const rowLength = 1 + width * 4;
  const raw = Buffer.alloc(rowLength * height, 0);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowLength;
    raw[rowOffset] = 0; // filter type None
    for (let x = 0; x < width; x += 1) {
      const pixel = rowOffset + 1 + x * 4;
      raw[pixel] = 28; // R
      raw[pixel + 1] = 120; // G
      raw[pixel + 2] = 60; // B
      raw[pixel + 3] = 255; // A
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function buildTinyPng4x4ImagePayload(): ImagePayload {
  return {
    name: "probe.png",
    mimeType: "image/png",
    buffer: buildSolidPng(4, 4),
  };
}

export function buildTinyPngWithTextMetadataPayload(): ImagePayload {
  const base = buildSolidPng(4, 4);
  const textData = Buffer.from("Comment\x00camera-roll", "latin1");
  const textChunk = pngChunk("tEXt", textData);
  const iend = base.subarray(base.length - 12);
  const withoutIend = base.subarray(0, base.length - 12);

  return {
    name: "probe-with-metadata.png",
    mimeType: "image/png",
    buffer: Buffer.concat([withoutIend, textChunk, iend]),
  };
}

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
    image: overrides?.image ?? buildTinyPng4x4ImagePayload(),
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
