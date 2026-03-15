const SENSITIVE_CACHE_CONTROL = "no-store";
const NO_CACHE_PRAGMA = "no-cache";
const EXPIRES_IMMEDIATELY = "0";

export const ACCESS_IDENTITY_VARY = "Cf-Access-Authenticated-User-Email";

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
  headers.set("cache-control", SENSITIVE_CACHE_CONTROL);
  headers.set("pragma", NO_CACHE_PRAGMA);
  headers.set("expires", EXPIRES_IMMEDIATELY);

  if (options.varyByAccessIdentity) {
    appendVary(headers, ACCESS_IDENTITY_VARY);
  }
}

export function withSensitiveResponseHeaders<T extends Response>(
  response: T,
  options: { varyByAccessIdentity?: boolean } = {},
): T {
  applySensitiveResponseHeaders(response.headers, options);
  return response;
}
