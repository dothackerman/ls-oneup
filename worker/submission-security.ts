import {
  SOIL_MOISTURE_VALUES,
  VITALITY_VALUES,
  type AllowedImageMime,
  type SoilMoisture,
  type Vitality,
} from "../src/shared/domain";

type SubmissionDataKey = {
  id: string;
  secret: string;
};

type SubmissionDataKeyRing = {
  current: SubmissionDataKey;
  legacy: SubmissionDataKey[];
};

type SubmissionEnvelopeVersion = "s1" | "b1";

type SubmissionEnvelope = {
  version: SubmissionEnvelopeVersion;
  alg: "A256GCM";
  key_id: string;
  iv: string;
  ciphertext: string;
};

export type SubmissionPayload = {
  crop_name: string;
  plant_vitality: Vitality;
  soil_moisture: SoilMoisture;
  gps_lat: number;
  gps_lon: number;
  gps_captured_at: string;
  image_key: string;
};

export class SubmissionSecurityConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionSecurityConfigError";
  }
}

export class SubmissionImagePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionImagePolicyError";
  }
}

export const ENCRYPTED_IMAGE_OBJECT_CONTENT_TYPE = "application/vnd.ls-oneup.encrypted-image+json";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const JPEG_SOI = 0xffd8;
const JPEG_SOS = 0xffda;
const JPEG_EOI = 0xffd9;
const PNG_TEXT_CHUNKS = new Set(["tEXt", "iTXt", "zTXt", "eXIf"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertValidKeyId(id: string): void {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) {
    throw new SubmissionSecurityConfigError(
      "Submission data key ids must be 1-64 characters of A-Z, a-z, 0-9, dot, underscore, or hyphen.",
    );
  }
}

function normalizeKey(value: unknown, label: string): SubmissionDataKey {
  if (!isPlainObject(value)) {
    throw new SubmissionSecurityConfigError(`Invalid ${label} submission data key entry.`);
  }

  const id = String(value.id ?? "").trim();
  const secret = String(value.secret ?? "").trim();

  if (id.length === 0) {
    throw new SubmissionSecurityConfigError(`Missing id for ${label} submission data key.`);
  }

  if (secret.length === 0) {
    throw new SubmissionSecurityConfigError(`Missing secret for ${label} submission data key.`);
  }

  assertValidKeyId(id);
  return { id, secret };
}

function assertUniqueKeyIds(keyRing: SubmissionDataKeyRing): void {
  const ids = new Set<string>();
  for (const key of [keyRing.current, ...keyRing.legacy]) {
    if (ids.has(key.id)) {
      throw new SubmissionSecurityConfigError(`Duplicate submission data key id '${key.id}'.`);
    }
    ids.add(key.id);
  }
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  let binary: string;
  try {
    binary = atob(`${normalized}${padding}`);
  } catch {
    throw new SubmissionSecurityConfigError("Submission data keys must use base64url encoding.");
  }

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function resolveSubmissionDataKeyRing(env: {
  SUBMISSION_DATA_KEYS_JSON?: string;
}): SubmissionDataKeyRing {
  const configured = env.SUBMISSION_DATA_KEYS_JSON?.trim();
  if (!configured) {
    throw new SubmissionSecurityConfigError("Missing submission data key configuration.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(configured);
  } catch {
    throw new SubmissionSecurityConfigError("SUBMISSION_DATA_KEYS_JSON must be valid JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new SubmissionSecurityConfigError("SUBMISSION_DATA_KEYS_JSON must be an object.");
  }

  const current = normalizeKey(parsed.current, "current");
  const legacy = Array.isArray(parsed.legacy)
    ? parsed.legacy.map((entry, index) => normalizeKey(entry, `legacy[${index}]`))
    : [];

  const keyRing = { current, legacy };
  assertUniqueKeyIds(keyRing);
  return keyRing;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function importAesKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const keyBytes = decodeBase64Url(secret);
  try {
    if (keyBytes.byteLength !== 32) {
      throw new SubmissionSecurityConfigError(
        "Submission data keys must decode to exactly 32 bytes for AES-256-GCM.",
      );
    }

    return await crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), "AES-GCM", false, usages);
  } finally {
    keyBytes.fill(0);
  }
}

function assertSubmissionPayload(value: unknown): asserts value is SubmissionPayload {
  if (!isPlainObject(value)) {
    throw new SubmissionSecurityConfigError("Submission payload must be an object.");
  }

  if (String(value.crop_name ?? "").trim().length === 0) {
    throw new SubmissionSecurityConfigError("Submission payload is missing crop_name.");
  }

  if (!VITALITY_VALUES.includes(value.plant_vitality as Vitality)) {
    throw new SubmissionSecurityConfigError("Submission payload has invalid plant_vitality.");
  }

  if (!SOIL_MOISTURE_VALUES.includes(value.soil_moisture as SoilMoisture)) {
    throw new SubmissionSecurityConfigError("Submission payload has invalid soil_moisture.");
  }

  if (typeof value.gps_lat !== "number" || value.gps_lat < -90 || value.gps_lat > 90) {
    throw new SubmissionSecurityConfigError("Submission payload has invalid gps_lat.");
  }

  if (typeof value.gps_lon !== "number" || value.gps_lon < -180 || value.gps_lon > 180) {
    throw new SubmissionSecurityConfigError("Submission payload has invalid gps_lon.");
  }

  if (String(value.gps_captured_at ?? "").trim().length === 0) {
    throw new SubmissionSecurityConfigError("Submission payload is missing gps_captured_at.");
  }

  if (String(value.image_key ?? "").trim().length === 0) {
    throw new SubmissionSecurityConfigError("Submission payload is missing image_key.");
  }
}

function parseEnvelope(
  value: string,
  expectedVersion: SubmissionEnvelopeVersion,
): SubmissionEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new SubmissionSecurityConfigError("Submission ciphertext must be valid JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new SubmissionSecurityConfigError("Submission ciphertext must be a JSON object.");
  }

  const version = String(parsed.version ?? "");
  const alg = String(parsed.alg ?? "");
  const keyId = String(parsed.key_id ?? "");
  const iv = String(parsed.iv ?? "");
  const ciphertext = String(parsed.ciphertext ?? "");

  if (
    version !== expectedVersion ||
    alg !== "A256GCM" ||
    keyId.length === 0 ||
    iv.length === 0 ||
    ciphertext.length === 0
  ) {
    throw new SubmissionSecurityConfigError("Submission ciphertext is missing required metadata.");
  }

  return {
    version: expectedVersion,
    alg: "A256GCM",
    key_id: keyId,
    iv,
    ciphertext,
  };
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function jpegContainsEmbeddedMetadata(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4 || readUint16(bytes, 0) !== JPEG_SOI) {
    return false;
  }

  let offset = 2;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = readUint16(bytes, offset);
    if (marker === JPEG_SOS || marker === JPEG_EOI) {
      return false;
    }

    if (marker === 0xffe1 || marker === 0xffe2 || marker === 0xffed || marker === 0xfffe) {
      return true;
    }

    if (offset + 4 > bytes.byteLength) {
      return false;
    }

    const segmentLength = readUint16(bytes, offset + 2);
    if (segmentLength < 2) {
      return false;
    }

    offset += 2 + segmentLength;
  }

  return false;
}

function pngContainsEmbeddedMetadata(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 8) {
    return false;
  }

  let offset = 8;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const chunkType = decoder.decode(bytes.slice(offset + 4, offset + 8));
    if (PNG_TEXT_CHUNKS.has(chunkType)) {
      return true;
    }

    offset += 12 + chunkLength;
  }

  return false;
}

export function assertSubmissionImageStoragePolicy(
  bytes: Uint8Array,
  mime: AllowedImageMime,
): void {
  const hasMetadata =
    mime === "image/jpeg"
      ? jpegContainsEmbeddedMetadata(bytes)
      : pngContainsEmbeddedMetadata(bytes);
  if (hasMetadata) {
    throw new SubmissionImagePolicyError(
      "Images with embedded EXIF, text, or comment metadata must be rejected before storage.",
    );
  }
}

async function encryptSubmissionBytes(
  version: SubmissionEnvelopeVersion,
  plaintextBytes: Uint8Array,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<string> {
  if (plaintextBytes.byteLength === 0) {
    throw new SubmissionSecurityConfigError("Submission ciphertext plaintext must not be empty.");
  }

  const { current } = resolveSubmissionDataKeyRing(env);
  const key = await importAesKey(current.secret, ["encrypt"]);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(plaintextBytes),
    );
    const ciphertextBytes = new Uint8Array(ciphertext);
    try {
      return JSON.stringify({
        version,
        alg: "A256GCM",
        key_id: current.id,
        iv: encodeBase64Url(iv),
        ciphertext: encodeBase64Url(ciphertextBytes),
      } satisfies SubmissionEnvelope);
    } finally {
      ciphertextBytes.fill(0);
    }
  } finally {
    iv.fill(0);
    plaintextBytes.fill(0);
  }
}

async function decryptSubmissionBytes(
  value: string,
  expectedVersion: SubmissionEnvelopeVersion,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<Uint8Array> {
  const envelope = parseEnvelope(value, expectedVersion);
  const keyRing = resolveSubmissionDataKeyRing(env);
  const keyEntry = [keyRing.current, ...keyRing.legacy].find(
    (candidate) => candidate.id === envelope.key_id,
  );

  if (!keyEntry) {
    throw new SubmissionSecurityConfigError(
      `Submission data key '${envelope.key_id}' is not configured for decryption.`,
    );
  }

  const key = await importAesKey(keyEntry.secret, ["decrypt"]);
  const iv = decodeBase64Url(envelope.iv);
  const ciphertext = decodeBase64Url(envelope.ciphertext);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    return new Uint8Array(plaintext);
  } catch (error) {
    if (error instanceof SubmissionSecurityConfigError) {
      throw error;
    }
    throw new SubmissionSecurityConfigError("Submission payload could not be decrypted.");
  } finally {
    iv.fill(0);
    ciphertext.fill(0);
  }
}

export async function encryptSubmissionPayload(
  payload: SubmissionPayload,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<string> {
  assertSubmissionPayload(payload);
  return encryptSubmissionBytes("s1", encoder.encode(JSON.stringify(payload)), env);
}

export async function decryptSubmissionPayload(
  value: string,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<SubmissionPayload> {
  const plaintextBytes = await decryptSubmissionBytes(value, "s1", env);
  try {
    const payload = JSON.parse(decoder.decode(plaintextBytes)) as unknown;
    assertSubmissionPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof SubmissionSecurityConfigError) {
      throw error;
    }
    throw new SubmissionSecurityConfigError("Submission payload could not be decrypted.");
  } finally {
    plaintextBytes.fill(0);
  }
}

export async function encryptSubmissionImageBytes(
  imageBytes: Uint8Array,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<string> {
  return encryptSubmissionBytes("b1", imageBytes, env);
}

export async function decryptSubmissionImageBytes(
  value: string,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<Uint8Array> {
  const plaintextBytes = await decryptSubmissionBytes(value, "b1", env);
  if (plaintextBytes.byteLength === 0) {
    plaintextBytes.fill(0);
    throw new SubmissionSecurityConfigError("Submission image payload could not be decrypted.");
  }
  return plaintextBytes;
}
