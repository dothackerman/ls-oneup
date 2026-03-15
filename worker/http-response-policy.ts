const SENSITIVE_CACHE_CONTROL = "no-store";
const NO_CACHE_PRAGMA = "no-cache";
const EXPIRES_IMMEDIATELY = "0";
const NO_REFERRER = "no-referrer";
const NO_SNIFF = "nosniff";
const DENY = "DENY";
const SAME_ORIGIN = "same-origin";
const APP_SHELL_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");
const APP_SHELL_PERMISSIONS_POLICY = "geolocation=(self), camera=(), microphone=()";

export const ACCESS_IDENTITY_VARY = "Cf-Access-Authenticated-User-Email";
export const APP_SHELL_PATH_PREFIXES = ["/admin", "/p/"] as const;

function appendVary(headers: Headers, value: string): void {
  const current = headers.get("vary");
  if (!current) {
    headers.set("vary", value);
    return;
  }

  const values = current
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (!values.includes(value)) {
    values.push(value);
  }
  headers.set("vary", values.join(", "));
}

export function applySensitiveResponseHeaders(
  headers: Headers,
  options: { varyByAccessIdentity?: boolean } = {},
): void {
  headers.set("referrer-policy", NO_REFERRER);
  headers.set("x-content-type-options", NO_SNIFF);
  headers.set("cache-control", SENSITIVE_CACHE_CONTROL);
  headers.set("pragma", NO_CACHE_PRAGMA);
  headers.set("expires", EXPIRES_IMMEDIATELY);

  if (options.varyByAccessIdentity) {
    appendVary(headers, ACCESS_IDENTITY_VARY);
  }
}

export function applyAppShellHeaders(
  headers: Headers,
  options: { varyByAccessIdentity?: boolean } = {},
): void {
  applySensitiveResponseHeaders(headers, options);
  headers.set("content-security-policy", APP_SHELL_CSP);
  headers.set("permissions-policy", APP_SHELL_PERMISSIONS_POLICY);
  headers.set("x-frame-options", DENY);
  headers.set("cross-origin-opener-policy", SAME_ORIGIN);
}

export function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function cloneResponse(response: Response): Response {
  return new Response(response.body, response);
}

export function withSensitiveResponseHeaders<T extends Response>(
  response: T,
  options: { varyByAccessIdentity?: boolean } = {},
): T {
  const cloned = cloneResponse(response) as T;
  applySensitiveResponseHeaders(cloned.headers, options);
  return cloned;
}

export function withAppShellResponseHeaders<T extends Response>(
  response: T,
  options: { varyByAccessIdentity?: boolean } = {},
): T {
  const cloned = cloneResponse(response) as T;
  applyAppShellHeaders(cloned.headers, options);
  return cloned;
}
