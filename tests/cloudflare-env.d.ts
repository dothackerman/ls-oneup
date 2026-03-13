import "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    PROBE_IMAGES: R2Bucket;
    TEST_MIGRATIONS: Array<{ name: string; queries: string[] }>;
    TOKEN_HMAC_KEYS_JSON: string;
    TOKEN_PEPPER?: string;
    APP_BASE_URL: string;
    DEV_BYPASS_ACCESS: string;
  }
}
