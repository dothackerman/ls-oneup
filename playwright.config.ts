import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run db:migrate:local && npm run dev -- --host 127.0.0.1 --port 8787",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
