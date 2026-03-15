import { jsonError } from "../src/shared/errors";

type TokenHmacKey = {
  id: string;
  secret: string;
};

type TokenHmacKeyRing = {
  current: TokenHmacKey;
  legacy: TokenHmacKey[];
};

const LEGACY_DEFAULT_KEY_ID = "legacy-default";
const TOKEN_HASH_VERSION = "h1";
const encoder = new TextEncoder();
const TOKEN_USED_MESSAGE = "Link wurde bereits verwendet.";
const TOKEN_EXPIRED_MESSAGE = "Link ist abgelaufen.";

export class TokenSecurityConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenSecurityConfigError";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertValidKeyId(id: string): void {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) {
    throw new TokenSecurityConfigError(
      "Token HMAC key ids must be 1-64 characters of A-Z, a-z, 0-9, dot, underscore, or hyphen.",
    );
  }
}

function normalizeKey(value: unknown, label: string): TokenHmacKey {
  if (!isPlainObject(value)) {
    throw new TokenSecurityConfigError(`Invalid ${label} token HMAC key entry.`);
  }

  const id = String(value.id ?? "").trim();
  const secret = String(value.secret ?? "");
  if (id.length === 0) {
    throw new TokenSecurityConfigError(`Missing id for ${label} token HMAC key.`);
  }
  if (secret.length === 0) {
    throw new TokenSecurityConfigError(`Missing secret for ${label} token HMAC key.`);
  }

  assertValidKeyId(id);
  return { id, secret };
}

function assertUniqueKeyIds(keyRing: TokenHmacKeyRing): void {
  const ids = new Set<string>();
  for (const key of [keyRing.current, ...keyRing.legacy]) {
    if (ids.has(key.id)) {
      throw new TokenSecurityConfigError(`Duplicate token HMAC key id '${key.id}'.`);
    }
    ids.add(key.id);
  }
}

export function resolveTokenHmacKeyRing(env: {
  TOKEN_HMAC_KEYS_JSON?: string;
  TOKEN_PEPPER?: string;
}): TokenHmacKeyRing {
  const configured = env.TOKEN_HMAC_KEYS_JSON?.trim();
  if (configured) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configured);
    } catch {
      throw new TokenSecurityConfigError("TOKEN_HMAC_KEYS_JSON must be valid JSON.");
    }

    if (!isPlainObject(parsed)) {
      throw new TokenSecurityConfigError("TOKEN_HMAC_KEYS_JSON must be an object.");
    }

    const current = normalizeKey(parsed.current, "current");
    const legacy = Array.isArray(parsed.legacy)
      ? parsed.legacy.map((entry, index) => normalizeKey(entry, `legacy[${index}]`))
      : [];
    const keyRing = { current, legacy };
    assertUniqueKeyIds(keyRing);
    return keyRing;
  }

  const legacySecret = env.TOKEN_PEPPER?.trim();
  if (!legacySecret) {
    throw new TokenSecurityConfigError("Missing token HMAC key configuration.");
  }

  return {
    current: { id: LEGACY_DEFAULT_KEY_ID, secret: legacySecret },
    legacy: [],
  };
}

function encodeAscii(value: string): Uint8Array {
  return new Uint8Array(encoder.encode(value));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const secretBytes = encodeAscii(secret);
  try {
    const secretBuffer = toArrayBuffer(secretBytes);
    return await crypto.subtle.importKey(
      "raw",
      secretBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } finally {
    secretBytes.fill(0);
  }
}

async function hmacDigestHex(token: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const tokenBytes = encodeAscii(token);
  try {
    const tokenBuffer = toArrayBuffer(tokenBytes);
    const signature = await crypto.subtle.sign("HMAC", key, tokenBuffer);
    const digestBytes = new Uint8Array(signature);
    try {
      return toHex(digestBytes);
    } finally {
      digestBytes.fill(0);
    }
  } finally {
    tokenBytes.fill(0);
  }
}

function formatVersionedTokenHash(keyId: string, digestHex: string): string {
  return `${TOKEN_HASH_VERSION}.${keyId}.${digestHex}`;
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  try {
    crypto.getRandomValues(bytes);
    return toBase64Url(bytesToBase64(bytes));
  } finally {
    bytes.fill(0);
  }
}

export async function hashTokenForStorage(
  token: string,
  env: {
    TOKEN_HMAC_KEYS_JSON?: string;
    TOKEN_PEPPER?: string;
  },
): Promise<string> {
  const { current } = resolveTokenHmacKeyRing(env);
  const digestHex = await hmacDigestHex(token, current.secret);
  return formatVersionedTokenHash(current.id, digestHex);
}

export async function legacyPlainTokenHash(token: string, secret: string): Promise<string> {
  return hmacDigestHex(token, secret);
}

export async function tokenHashCandidates(
  token: string,
  env: {
    TOKEN_HMAC_KEYS_JSON?: string;
    TOKEN_PEPPER?: string;
  },
): Promise<string[]> {
  const keyRing = resolveTokenHmacKeyRing(env);
  const allKeys = [keyRing.current, ...keyRing.legacy];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const key of allKeys) {
    const digestHex = await hmacDigestHex(token, key.secret);
    for (const candidate of [formatVersionedTokenHash(key.id, digestHex), digestHex]) {
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      out.push(candidate);
    }
  }

  return out;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = encodeAscii(a);
  const bBytes = encodeAscii(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length ^ bBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }

  aBytes.fill(0);
  bBytes.fill(0);
  return mismatch === 0;
}

export function matchStoredTokenHash(storedHash: string, candidates: string[]): string | null {
  let matched: string | null = null;

  for (const candidate of candidates) {
    const isMatch = constantTimeEqual(storedHash, candidate);
    if (isMatch && matched === null) {
      matched = candidate;
    }
  }

  return matched;
}

export function normalizeTokenStateError(
  tokenState: { submitted_at: string | null; expire_by: string },
  nowIso: string,
): Response {
  if (tokenState.submitted_at) {
    return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
  }

  if (tokenState.expire_by <= nowIso) {
    return jsonError(410, "TOKEN_EXPIRED", TOKEN_EXPIRED_MESSAGE);
  }

  return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
}

export function handleCryptoSecurityError(scope: "token" | "submission", error: unknown): Response {
  console.error("crypto_security_error", {
    scope,
    error: error instanceof Error ? error.message : "unknown",
  });

  return jsonError(503, "SECURITY_UNAVAILABLE", "Sicherheitsprüfung temporär nicht verfügbar.");
}
