import path from "node:path";
import { defineWorkersProject, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));

  return {
    test: {
      include: ["tests/integration/**/*.test.ts"],
      setupFiles: ["./tests/integration/setup.ts"],
      poolOptions: {
        workers: {
          main: "./worker/index.ts",
          wrangler: {
            configPath: "./wrangler.jsonc",
          },
          miniflare: {
            bindings: {
              TOKEN_PEPPER: "test-pepper",
              APP_BASE_URL: "https://example.test",
              DEV_BYPASS_ACCESS: "true",
              TEST_MIGRATIONS: migrations,
            },
            r2Buckets: ["PROBE_IMAGES"],
            d1Databases: ["DB"],
          },
        },
      },
    },
  };
});
