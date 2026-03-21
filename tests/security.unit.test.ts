import { describe, expect, it } from "vitest";
import {
  isEphemeralMigrationReference,
  validateInventoryDocument,
} from "../scripts/crypto-gate.mjs";
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
  decryptSubmissionImageBytes,
  decryptSubmissionPayload,
  encryptSubmissionImageBytes,
  encryptSubmissionPayload,
} from "../worker/submission-security";
import {
  buildSubmissionArtifactRetention,
  hasRejectedImageMetadata,
  SUBMISSION_ARTIFACT_RETENTION_CLASS,
  SUBMISSION_ARTIFACT_RETENTION_DAYS,
} from "../worker/data-retention";

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

const JPEG_WITH_EXIF = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x41, 0x42, 0x43, 0x44,
  0x45, 0x46, 0xff, 0xd9,
]);

const JPEG_WITH_APP13 = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xed, 0x00, 0x10, 0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20,
  0x33, 0x2e, 0x30, 0xff, 0xd9,
]);

const JPEG_WITH_COMMENT = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xfe, 0x00, 0x0c, 0x63, 0x61, 0x6d, 0x65, 0x72, 0x61, 0x2d, 0x72, 0x6f, 0x6c,
  0x6c, 0xff, 0xd9,
]);

const JPEG_WITH_ICC_PROFILE = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe2, 0x00, 0x1a, 0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c,
  0x45, 0x00, 0x01, 0x01, 0x73, 0x52, 0x47, 0x42, 0x00, 0x00, 0xff, 0xd9,
]);

const PNG_WITH_TEXT = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0,
  0, 31, 21, 196, 137, 0, 0, 0, 10, 116, 69, 88, 116, 99, 111, 109, 109, 101, 110, 116, 0, 0, 0, 0,
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

const PNG_WITH_HUGE_CHUNK_LENGTH = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 128, 0, 0, 0, 116, 69, 88, 116, 0, 0, 0, 0,
]);

const CRYPTO_INVENTORY_FIXTURE = {
  schema_version: 2,
  reviewed_at: "2026-03-21",
  owner: "application-engineering",
  policy_ref: "docs/security/crypto-policy.md",
  inventory: [
    {
      id: "fixture-entry",
      purpose: "Exercise gate semantics.",
      scope: "runtime",
      algorithm: "AES-256-GCM",
      key_source: "fixture",
      rotation_policy: "Not applicable.",
      agility_plan: "Keep the fixture small and explicit.",
      current_code_references: ["worker/submission-security.ts"],
      provenance_code_references: ["migrations/0003_m1_submission_ciphertext.sql"],
      discovery: [
        {
          marker_id: "webcrypto-subtle-encrypt",
          path: "worker/submission-security.ts",
        },
      ],
    },
  ],
  migration_plan: ["Keep provenance separate from live evidence."],
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

  it("encrypts and decrypts uploaded image bytes with AES-GCM envelopes", async () => {
    const originalBytes = Uint8Array.from([255, 216, 255, 219, 1, 2, 3, 4, 5, 6]);
    const encrypted = await encryptSubmissionImageBytes(Uint8Array.from(originalBytes), TEST_ENV);

    expect(encrypted.includes('"version":"b1"')).toBe(true);
    const decrypted = await decryptSubmissionImageBytes(encrypted, TEST_ENV);
    expect(Array.from(decrypted)).toEqual(Array.from(originalBytes));
    decrypted.fill(0);
  });

  it("decrypts uploaded image bytes after key rotation via legacy entries", async () => {
    const encrypted = await encryptSubmissionImageBytes(
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]),
      TEST_ENV,
    );

    const decrypted = await decryptSubmissionImageBytes(encrypted, ROTATED_SUBMISSION_ENV);
    expect(Array.from(decrypted)).toEqual([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
    decrypted.fill(0);
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

  it("derives a stable submission-artifact retention policy", () => {
    const policy = buildSubmissionArtifactRetention("2026-03-15T12:00:00.000Z");

    expect(policy.customMetadata.retention_class).toBe(SUBMISSION_ARTIFACT_RETENTION_CLASS);
    expect(policy.customMetadata.image_metadata_policy).toBe("reject_embedded_metadata");
    expect(policy.customMetadata.delete_after).toBe(policy.deleteAfter);

    const start = new Date("2026-03-15T12:00:00.000Z");
    const end = new Date(policy.deleteAfter);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(SUBMISSION_ARTIFACT_RETENTION_DAYS);
  });

  it("rejects sensitive JPEG/PNG metadata while allowing benign APP2 profiles", () => {
    expect(hasRejectedImageMetadata(JPEG_WITH_EXIF, "image/jpeg")).toBe(true);
    expect(hasRejectedImageMetadata(JPEG_WITH_APP13, "image/jpeg")).toBe(true);
    expect(hasRejectedImageMetadata(JPEG_WITH_COMMENT, "image/jpeg")).toBe(true);
    expect(hasRejectedImageMetadata(PNG_WITH_TEXT, "image/png")).toBe(true);
    expect(hasRejectedImageMetadata(PNG_WITH_HUGE_CHUNK_LENGTH, "image/png")).toBe(false);
    expect(hasRejectedImageMetadata(JPEG_WITH_ICC_PROFILE, "image/jpeg")).toBe(false);
    expect(
      hasRejectedImageMetadata(
        Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]),
        "image/jpeg",
      ),
    ).toBe(false);
    expect(
      hasRejectedImageMetadata(
        Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
        "image/png",
      ),
    ).toBe(false);
  });
});

describe("scripts/crypto-gate", () => {
  it("returns validation errors for non-object inventory shapes", async () => {
    const errors = await validateInventoryDocument(undefined, {
      pathExists: async () => true,
    });

    expect(errors).toContain("top-level schema_version must be 2");
    expect(errors).toContain("inventory is empty");
    expect(errors).toContain("migration_plan must contain at least one entry");
  });

  it("treats migration files as provenance rather than live evidence", async () => {
    const errors = await validateInventoryDocument(CRYPTO_INVENTORY_FIXTURE, {
      pathExists: async (relPath: string) =>
        relPath !== "migrations/0003_m1_submission_ciphertext.sql",
    });

    expect(errors).toEqual([]);
  });

  it("rejects ephemeral migrations in current live references", async () => {
    const inventory = {
      ...CRYPTO_INVENTORY_FIXTURE,
      inventory: [
        {
          ...CRYPTO_INVENTORY_FIXTURE.inventory[0],
          current_code_references: [
            "worker/submission-security.ts",
            "migrations/0002_m1_add_submission_ciphertext.sql",
          ],
        },
      ],
    };

    const errors = await validateInventoryDocument(inventory, {
      pathExists: async () => true,
    });

    expect(errors).toContain(
      "Invalid inventory entry 'fixture-entry': ephemeral migration references are not allowed in current_code_references: migrations/0002_m1_add_submission_ciphertext.sql",
    );
  });

  it("exposes the migration-path rule as a reusable helper", () => {
    expect(isEphemeralMigrationReference("migrations/0002_m1_add_submission_ciphertext.sql")).toBe(
      true,
    );
    expect(isEphemeralMigrationReference("worker/submission-security.ts")).toBe(false);
  });
});
