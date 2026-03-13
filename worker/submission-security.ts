import {
  SOIL_MOISTURE_VALUES,
  VITALITY_VALUES,
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

type SubmissionEnvelope = {
  version: "s1";
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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
  let binary = "";
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

function parseEnvelope(value: string): SubmissionEnvelope {
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
    version !== "s1" ||
    alg !== "A256GCM" ||
    keyId.length === 0 ||
    iv.length === 0 ||
    ciphertext.length === 0
  ) {
    throw new SubmissionSecurityConfigError("Submission ciphertext is missing required metadata.");
  }

  return {
    version: "s1",
    alg: "A256GCM",
    key_id: keyId,
    iv,
    ciphertext,
  };
}

export async function encryptSubmissionPayload(
  payload: SubmissionPayload,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<string> {
  assertSubmissionPayload(payload);
  const { current } = resolveSubmissionDataKeyRing(env);
  const key = await importAesKey(current.secret, ["encrypt"]);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const plaintextBytes = encoder.encode(JSON.stringify(payload));
  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(plaintextBytes),
    );
    const ciphertextBytes = new Uint8Array(ciphertext);
    try {
      return JSON.stringify({
        version: "s1",
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

export async function decryptSubmissionPayload(
  value: string,
  env: {
    SUBMISSION_DATA_KEYS_JSON?: string;
  },
): Promise<SubmissionPayload> {
  const envelope = parseEnvelope(value);
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

    const plaintextBytes = new Uint8Array(plaintext);
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
