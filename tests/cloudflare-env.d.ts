declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      PROBE_IMAGES: R2Bucket;
      TEST_MIGRATIONS: Array<{ name: string; queries: string[] }>;
      TOKEN_HMAC_KEYS_JSON: string;
      TOKEN_PEPPER?: string;
      SUBMISSION_DATA_KEYS_JSON: string;
      APP_BASE_URL: string;
      DEV_BYPASS_ACCESS: string;
    }
  }
}

export {};
