import { defineConfig } from "@playwright/test";

const PLAYWRIGHT_DEV_PORT = 8791;
const LOCAL_TOKEN_HMAC_KEYS_JSON = JSON.stringify({
  current: {
    id: "playwright-local",
    secret: "playwright-local-token-secret-0123456789abcdefghijklmnopqrstuvwxyz",
  },
});
const LOCAL_SUBMISSION_DATA_KEYS_JSON = JSON.stringify({
  current: {
    id: "playwright-submit-local",
    secret: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
  },
});

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PLAYWRIGHT_DEV_PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `TOKEN_HMAC_KEYS_JSON='${LOCAL_TOKEN_HMAC_KEYS_JSON}' SUBMISSION_DATA_KEYS_JSON='${LOCAL_SUBMISSION_DATA_KEYS_JSON}' node scripts/ensure-dev-vars.mjs && npm run db:migrate:local && npm run dev -- --host 127.0.0.1 --port ${PLAYWRIGHT_DEV_PORT}`,
    url: `http://127.0.0.1:${PLAYWRIGHT_DEV_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
