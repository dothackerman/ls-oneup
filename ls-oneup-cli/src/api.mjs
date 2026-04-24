import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError } from "./errors.mjs";

function addOptionalQuery(url, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  url.searchParams.set(key, value);
}

function mapContentTypeToExtension(contentType) {
  if (!contentType) {
    return "bin";
  }
  const normalized = contentType.toLowerCase();
  if (normalized.includes("image/jpeg")) {
    return "jpg";
  }
  if (normalized.includes("image/png")) {
    return "png";
  }
  if (normalized.includes("image/webp")) {
    return "webp";
  }
  return "bin";
}

function assertValidProbeId(probeId) {
  if (!probeId || typeof probeId !== "string") {
    throw new CliError("VALIDATION_ERROR", "probe_id is required.");
  }
  const normalized = probeId.trim();
  if (!/^[A-Za-z0-9-]+$/.test(normalized)) {
    throw new CliError("VALIDATION_ERROR", "probe_id contains unsupported characters.");
  }
  return normalized;
}

export async function listProbes({
  baseUrl,
  filters,
  getToken,
  fetchImpl = fetch,
}) {
  const url = new URL("/api/admin/probes", baseUrl);
  addOptionalQuery(url, "customer_name", filters.customer_name);
  addOptionalQuery(url, "order_number", filters.order_number);
  addOptionalQuery(url, "status", filters.status);

  const token = await getToken(baseUrl);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "cf-access-token": token,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new CliError("API_ERROR", "Admin probes request failed.", {
      status: response.status,
      body,
    });
  }
  return await response.json();
}

export async function fetchProbeImage({
  baseUrl,
  probeId,
  outputPath,
  getToken,
  fetchImpl = fetch,
}) {
  const safeProbeId = assertValidProbeId(probeId);
  const url = new URL(`/api/admin/probes/${safeProbeId}/image`, baseUrl);
  const token = await getToken(baseUrl);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "cf-access-token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new CliError("API_ERROR", "Probe image fetch failed.", {
      status: response.status,
      body,
      probe_id: safeProbeId,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const resolvedOutputPath = outputPath
    ? path.resolve(outputPath)
    : path.join(os.tmpdir(), "ls-oneup", `${safeProbeId}.${mapContentTypeToExtension(contentType)}`);
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, bytes);

  return {
    probe_id: safeProbeId,
    output_path: resolvedOutputPath,
    bytes: bytes.length,
    content_type: contentType,
    fetched_at: new Date().toISOString(),
  };
}
