import { defineConfig } from "@playwright/test";

const LOCAL_TOKEN_HMAC_KEYS_JSON = JSON.stringify({
  current: {
    id: "playwright-local",
    secret: "playwright-local-token-secret-0123456789abcdefghijklmnopqrstuvwxyz",
  },
});

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
  webServer: {
    command: `TOKEN_HMAC_KEYS_JSON='${LOCAL_TOKEN_HMAC_KEYS_JSON}' npm run db:migrate:local && TOKEN_HMAC_KEYS_JSON='${LOCAL_TOKEN_HMAC_KEYS_JSON}' npm run dev -- --host 127.0.0.1 --port 8787`,
    url: "http://127.0.0.1:8787",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
