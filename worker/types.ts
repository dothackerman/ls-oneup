export type Env = {
  DB: D1Database;
  PROBE_IMAGES: R2Bucket;
  TOKEN_PEPPER: string;
  APP_BASE_URL: string;
  DEV_BYPASS_ACCESS?: string;
};
