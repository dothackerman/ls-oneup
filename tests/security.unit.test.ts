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
});
