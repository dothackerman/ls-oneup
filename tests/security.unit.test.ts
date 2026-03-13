import { describe, expect, it } from "vitest";
import {
  TokenSecurityConfigError,
  constantTimeEqual,
  hashTokenForStorage,
  legacyPlainTokenHash,
  matchStoredTokenHash,
  resolveTokenHmacKeyRing,
  tokenHashCandidates,
} from "../worker/security";
import {
  SubmissionSecurityConfigError,
  decryptSubmissionPayload,
  encryptSubmissionPayload,
} from "../worker/submission-security";

const TEST_ENV = {
  TOKEN_HMAC_KEYS_JSON: JSON.stringify({
    current: {
      id: "test-current",
      secret: "test-token-secret-0123456789abcdefghijklmnopqrstuvwxyz",
    },
    legacy: [
      {
        id: "test-legacy",
        secret: "legacy-token-secret-0123456789abcdefghijklmnopqrstuvwxyz",
      },
    ],
  }),
  SUBMISSION_DATA_KEYS_JSON: JSON.stringify({
    current: {
      id: "submit-current",
      secret: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
    },
  }),
};

const ROTATED_SUBMISSION_ENV = {
  SUBMISSION_DATA_KEYS_JSON: JSON.stringify({
    current: {
      id: "submit-next",
      secret: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU",
    },
    legacy: [
      {
        id: "submit-current",
        secret: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
      },
    ],
  }),
};

describe("worker/security", () => {
  it("fails closed when no token HMAC configuration is available", () => {
    expect(() => resolveTokenHmacKeyRing({})).toThrow(TokenSecurityConfigError);
  });

  it("returns versioned storage hashes and migration candidates", async () => {
    const token = "test-token";
    const storedHash = await hashTokenForStorage(token, TEST_ENV);
    const candidates = await tokenHashCandidates(token, TEST_ENV);

    expect(storedHash.startsWith("h1.test-current.")).toBe(true);
    expect(candidates).toContain(storedHash);
    expect(candidates).toContain(
      await legacyPlainTokenHash(token, "test-token-secret-0123456789abcdefghijklmnopqrstuvwxyz"),
    );
    expect(candidates).toContain(
      await legacyPlainTokenHash(token, "legacy-token-secret-0123456789abcdefghijklmnopqrstuvwxyz"),
    );
  });

  it("matches stored hashes without early exit semantics changing correctness", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "ab")).toBe(false);

    expect(
      matchStoredTokenHash("h1.test-current.digest", ["wrong", "h1.test-current.digest"]),
    ).toBe("h1.test-current.digest");
    expect(matchStoredTokenHash("h1.test-current.digest", ["wrong", "still-wrong"])).toBeNull();
  });

  it("encrypts and decrypts submission payloads with AES-GCM envelopes", async () => {
    const ciphertext = await encryptSubmissionPayload(
      {
        crop_name: "Kartoffeln",
        plant_vitality: "normal",
        soil_moisture: "normal",
        gps_lat: 47.3769,
        gps_lon: 8.5417,
        gps_captured_at: "2026-03-13T12:00:00.000Z",
        image_key: "probe-1/image.jpg",
      },
      TEST_ENV,
    );

    expect(ciphertext.includes('"version":"s1"')).toBe(true);
    const decrypted = await decryptSubmissionPayload(ciphertext, TEST_ENV);
    expect(decrypted.crop_name).toBe("Kartoffeln");
    expect(decrypted.image_key).toBe("probe-1/image.jpg");
  });

  it("decrypts submission payloads after key rotation via legacy entries", async () => {
    const ciphertext = await encryptSubmissionPayload(
      {
        crop_name: "Mais",
        plant_vitality: "normal",
        soil_moisture: "trocken",
        gps_lat: 47.11,
        gps_lon: 8.33,
        gps_captured_at: "2026-03-13T12:00:00.000Z",
        image_key: "probe-2/image.jpg",
      },
      TEST_ENV,
    );

    const decrypted = await decryptSubmissionPayload(ciphertext, ROTATED_SUBMISSION_ENV);
    expect(decrypted.crop_name).toBe("Mais");
    expect(decrypted.soil_moisture).toBe("trocken");
  });

  it("fails closed when submission data encryption is not configured", async () => {
    await expect(
      encryptSubmissionPayload(
        {
          crop_name: "Kartoffeln",
          plant_vitality: "normal",
          soil_moisture: "normal",
          gps_lat: 47.3769,
          gps_lon: 8.5417,
          gps_captured_at: "2026-03-13T12:00:00.000Z",
          image_key: "probe-1/image.jpg",
        },
        {},
      ),
    ).rejects.toThrow(SubmissionSecurityConfigError);
  });
});
