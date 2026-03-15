import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ProbeStatus } from "../src/shared/domain";
import { jsonError } from "../src/shared/errors";
import {
  createProbesSchema,
  cropOverrideSchema,
  listProbesQuerySchema,
} from "../src/shared/validation";
import {
  applySubmit,
  findByTokenHashes,
  getProbeImage,
  getProbeSubmission,
  insertProbe,
  listProbes,
  orderExists,
  overrideEncryptedSubmission,
  overrideCrop,
} from "./repository";
import {
  generateToken,
  handleCryptoSecurityError,
  hashTokenForStorage,
  matchStoredTokenHash,
  normalizeTokenStateError,
  tokenHashCandidates,
} from "./security";
import {
  ENCRYPTED_IMAGE_OBJECT_CONTENT_TYPE,
  decryptSubmissionImageBytes,
  decryptSubmissionPayload,
  encryptSubmissionImageBytes,
  encryptSubmissionPayload,
} from "./submission-security";
import {
  applyAppShellHeaders,
  applySensitiveResponseHeaders,
  isAppShellRoute,
  withAppShellResponseHeaders,
} from "./http-response-policy";
import {
  enforceKnownApiMethod,
  ensureSubmitTokenState,
  parseSubmitRequest,
} from "./request-guards";
import {
  buildSubmissionArtifactRetention,
  hasRejectedImageMetadata,
  IMAGE_METADATA_REJECTED_CODE,
  IMAGE_METADATA_REJECTED_MESSAGE,
} from "./data-retention";
import type { Env } from "./types";

type WorkerEnv = Env & {
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: WorkerEnv }>();

function nowIso(): string {
  return new Date().toISOString();
}

function plusDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function inferBaseUrl(reqUrl: string, configured?: string): string {
  if (configured && configured.length > 0) {
    return configured;
  }
  return new URL(reqUrl).origin;
}

async function resolveSubmissionView(
  item: {
    crop_name: string | null;
    plant_vitality: string | null;
    soil_moisture: string | null;
    gps_lat: number | null;
    gps_lon: number | null;
    gps_captured_at: string | null;
    image_key: string | null;
    submission_ciphertext: string | null;
  },
  env: WorkerEnv,
): Promise<{
  crop_name: string | null;
  plant_vitality: string | null;
  soil_moisture: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_captured_at: string | null;
  image_key: string | null;
}> {
  if (!item.submission_ciphertext) {
    return {
      crop_name: item.crop_name,
      plant_vitality: item.plant_vitality,
      soil_moisture: item.soil_moisture,
      gps_lat: item.gps_lat,
      gps_lon: item.gps_lon,
      gps_captured_at: item.gps_captured_at,
      image_key: item.image_key,
    };
  }

  const decrypted = await decryptSubmissionPayload(item.submission_ciphertext, env);
  return {
    crop_name: decrypted.crop_name,
    plant_vitality: decrypted.plant_vitality,
    soil_moisture: decrypted.soil_moisture,
    gps_lat: decrypted.gps_lat,
    gps_lon: decrypted.gps_lon,
    gps_captured_at: decrypted.gps_captured_at,
    image_key: decrypted.image_key,
  };
}

app.use("/api/admin/*", async (c, next) => {
  if (c.env.DEV_BYPASS_ACCESS === "true") {
    await next();
    applySensitiveResponseHeaders(c.res.headers, { varyByAccessIdentity: true });
    return;
  }

  const user = c.req.header("Cf-Access-Authenticated-User-Email");
  if (!user) {
    c.status(401 as ContentfulStatusCode);
    const response = c.json({
      error_code: "ACCESS_REQUIRED",
      message: "Admin-Zugriff erforderlich.",
    });
    applySensitiveResponseHeaders(response.headers, { varyByAccessIdentity: true });
    return response;
  }

  await next();
  applySensitiveResponseHeaders(c.res.headers, { varyByAccessIdentity: true });
});

app.use("/api/probe/*", async (c, next) => {
  await next();
  applySensitiveResponseHeaders(c.res.headers);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/admin/probes", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createProbesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Ungültige Anfrage.");
  }

  const { customer_name, order_number, probe_count } = parsed.data;

  if (await orderExists(c.env.DB, customer_name, order_number)) {
    return jsonError(409, "ORDER_ALREADY_EXISTS", "Für diesen Auftrag bestehen bereits Links.");
  }

  const createdAt = nowIso();
  const expireBy = plusDays(createdAt, 60);
  const baseUrl = inferBaseUrl(c.req.url, c.env.APP_BASE_URL);

  const items: Array<{
    probe_id: string;
    probe_number: number;
    token_url: string;
    created_at: string;
    expire_by: string;
  }> = [];

  try {
    for (let probeNumber = 1; probeNumber <= probe_count; probeNumber += 1) {
      const token = generateToken();
      let hashed: string;
      try {
        hashed = await hashTokenForStorage(token, c.env);
      } catch (error) {
        return handleCryptoSecurityError("token", error);
      }
      const probeId = crypto.randomUUID();

      await insertProbe(c.env.DB, {
        id: probeId,
        customer_name,
        order_number,
        probe_number: probeNumber,
        token_hash: hashed,
        created_at: createdAt,
        expire_by: expireBy,
      });

      items.push({
        probe_id: probeId,
        probe_number: probeNumber,
        token_url: `${baseUrl.replace(/\/$/, "")}/p/${token}`,
        created_at: createdAt,
        expire_by: expireBy,
      });
    }
  } catch (error) {
    console.error("probe_create_failed", {
      customer_name,
      order_number,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(409, "PROBE_CONFLICT", "Probe konnte nicht erstellt werden.");
  }

  return c.json({ items }, 201);
});

app.get("/api/admin/probes", async (c) => {
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = listProbesQuerySchema.safeParse(query);

  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Ungültige Filterparameter.");
  }

  const filters: { customer_name?: string; order_number?: string; status?: ProbeStatus } = {
    customer_name: parsed.data.customer_name,
    order_number: parsed.data.order_number,
    status: parsed.data.status,
  };

  const items = await listProbes(c.env.DB, filters, nowIso());
  let resolvedItems: Awaited<ReturnType<typeof resolveSubmissionView>>[];
  try {
    resolvedItems = await Promise.all(items.map((item) => resolveSubmissionView(item, c.env)));
  } catch (error) {
    return handleCryptoSecurityError("submission", error);
  }

  return c.json({
    items: items.map((item, index) => ({
      probe_id: item.probe_id,
      customer_name: item.customer_name,
      order_number: item.order_number,
      probe_number: item.probe_number,
      status: item.status,
      created_at: item.created_at,
      expire_by: item.expire_by,
      submitted_at: item.submitted_at,
      crop_name: resolvedItems[index].crop_name,
      plant_vitality: resolvedItems[index].plant_vitality,
      soil_moisture: resolvedItems[index].soil_moisture,
      gps_lat: resolvedItems[index].gps_lat,
      gps_lon: resolvedItems[index].gps_lon,
      gps_captured_at: resolvedItems[index].gps_captured_at,
      crop_overridden_at: item.crop_overridden_at,
      image_url: resolvedItems[index].image_key ? `/api/admin/probes/${item.probe_id}/image` : null,
    })),
  });
});

app.patch("/api/admin/probes/:id/crop-override", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = cropOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Ungültiger Kulturname.");
  }

  const probeId = c.req.param("id");
  const at = nowIso();
  const submission = await getProbeSubmission(c.env.DB, probeId);
  if (!submission) {
    return jsonError(404, "PROBE_NOT_FOUND", "Probe nicht gefunden.");
  }
  if (!submission.submitted_at) {
    return jsonError(
      409,
      "PROBE_NOT_SUBMITTED",
      "Kulturname kann erst nach Einreichung angepasst werden.",
    );
  }

  let result;
  if (submission.submission_ciphertext) {
    let decrypted;
    try {
      decrypted = await decryptSubmissionPayload(submission.submission_ciphertext, c.env);
    } catch (error) {
      return handleCryptoSecurityError("submission", error);
    }

    try {
      result = await overrideEncryptedSubmission(
        c.env.DB,
        probeId,
        await encryptSubmissionPayload(
          {
            ...decrypted,
            crop_name: parsed.data.crop_name,
          },
          c.env,
        ),
        at,
      );
    } catch (error) {
      return handleCryptoSecurityError("submission", error);
    }
  } else {
    result = await overrideCrop(c.env.DB, probeId, parsed.data.crop_name, at);
  }

  if (result === "not_found") {
    return jsonError(404, "PROBE_NOT_FOUND", "Probe nicht gefunden.");
  }
  if (result === "not_submitted") {
    return jsonError(
      409,
      "PROBE_NOT_SUBMITTED",
      "Kulturname kann erst nach Einreichung angepasst werden.",
    );
  }

  return c.json({ probe_id: probeId, crop_name: parsed.data.crop_name, crop_overridden_at: at });
});

app.get("/api/admin/probes/:id/image", async (c) => {
  const probeId = c.req.param("id");
  const imageRef = await getProbeImage(c.env.DB, probeId);
  if (!imageRef) {
    return jsonError(404, "IMAGE_NOT_FOUND", "Kein Bild vorhanden.");
  }

  let imageKey = imageRef.image_key;
  if (imageRef.submission_ciphertext) {
    try {
      imageKey = (await decryptSubmissionPayload(imageRef.submission_ciphertext, c.env)).image_key;
    } catch (error) {
      return handleCryptoSecurityError("submission", error);
    }
  }

  if (!imageKey) {
    return jsonError(404, "IMAGE_NOT_FOUND", "Kein Bild vorhanden.");
  }

  const obj = await c.env.PROBE_IMAGES.get(imageKey);
  if (!obj) {
    return jsonError(404, "IMAGE_NOT_FOUND", "Bild konnte nicht geladen werden.");
  }

  const storedHeaders = new Headers();
  obj.writeHttpMetadata(storedHeaders);

  const headers = new Headers();
  headers.set("content-type", imageRef.image_mime ?? "image/jpeg");
  headers.set("content-disposition", "inline");
  applySensitiveResponseHeaders(headers, { varyByAccessIdentity: true });

  if (storedHeaders.get("content-type") === ENCRYPTED_IMAGE_OBJECT_CONTENT_TYPE) {
    let decryptedImageBytes: Uint8Array;
    try {
      decryptedImageBytes = await decryptSubmissionImageBytes(await obj.text(), c.env);
    } catch (error) {
      return handleCryptoSecurityError("submission", error);
    }

    const responseBytes = new Uint8Array(decryptedImageBytes);
    decryptedImageBytes.fill(0);
    return new Response(responseBytes, { headers });
  }

  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

app.get("/api/probe/:token", async (c) => {
  const token = c.req.param("token");
  let tokenHashes: string[];
  try {
    tokenHashes = await tokenHashCandidates(token, c.env);
  } catch (error) {
    return handleCryptoSecurityError("token", error);
  }
  const state = await findByTokenHashes(c.env.DB, tokenHashes);

  if (!state) {
    return jsonError(404, "TOKEN_NOT_FOUND", "Link nicht gefunden.");
  }

  const matchedHash = matchStoredTokenHash(state.token_hash, tokenHashes);
  if (!matchedHash) {
    return jsonError(404, "TOKEN_NOT_FOUND", "Link nicht gefunden.");
  }

  const now = nowIso();

  if (state.submitted_at) {
    return normalizeTokenStateError(state, now);
  }

  if (state.expire_by <= now) {
    return normalizeTokenStateError(state, now);
  }

  return c.json({
    token_state: "open",
    customer_name: state.customer_name,
    order_number: state.order_number,
    probe_number: state.probe_number,
  });
});

app.post("/api/probe/:token/submit", async (c) => {
  const token = c.req.param("token");
  let tokenHashes: string[];
  try {
    tokenHashes = await tokenHashCandidates(token, c.env);
  } catch (error) {
    return handleCryptoSecurityError("token", error);
  }
  const initialState = await findByTokenHashes(c.env.DB, tokenHashes);

  if (!initialState) {
    return jsonError(404, "TOKEN_NOT_FOUND", "Link nicht gefunden.");
  }

  const matchedHash = matchStoredTokenHash(initialState.token_hash, tokenHashes);
  if (!matchedHash) {
    return jsonError(404, "TOKEN_NOT_FOUND", "Link nicht gefunden.");
  }

  const startNow = nowIso();

  const tokenStateError = ensureSubmitTokenState(initialState, startNow);
  if (tokenStateError) {
    return tokenStateError;
  }

  const guardedRequest = await parseSubmitRequest(c.req.raw);
  if (guardedRequest instanceof Response) {
    return guardedRequest;
  }

  const { fields, image, imageBytes } = guardedRequest;
  if (hasRejectedImageMetadata(imageBytes, image.type)) {
    imageBytes.fill(0);
    return jsonError(415, IMAGE_METADATA_REJECTED_CODE, IMAGE_METADATA_REJECTED_MESSAGE);
  }

  const extension = image.type === "image/png" ? "png" : "jpg";
  const imageKey = `${initialState.id}/${crypto.randomUUID()}.${extension}`;
  const submitNow = nowIso();
  const retentionPolicy = buildSubmissionArtifactRetention(submitNow);
  let submissionCiphertext: string;
  try {
    submissionCiphertext = await encryptSubmissionPayload(
      {
        crop_name: fields.crop_name,
        plant_vitality: fields.vitality,
        soil_moisture: fields.soil_moisture,
        gps_lat: fields.gps_lat,
        gps_lon: fields.gps_lon,
        gps_captured_at: fields.gps_captured_at,
        image_key: imageKey,
      },
      c.env,
    );
  } catch (error) {
    imageBytes.fill(0);
    return handleCryptoSecurityError("submission", error);
  }

  let encryptedImageObject: string;
  try {
    encryptedImageObject = await encryptSubmissionImageBytes(imageBytes, c.env);
  } catch (error) {
    imageBytes.fill(0);
    return handleCryptoSecurityError("submission", error);
  }

  try {
    await c.env.PROBE_IMAGES.put(imageKey, encryptedImageObject, {
      httpMetadata: {
        contentType: ENCRYPTED_IMAGE_OBJECT_CONTENT_TYPE,
      },
      customMetadata: retentionPolicy.customMetadata,
    });
  } catch (error) {
    imageBytes.fill(0);
    console.error("r2_upload_failed", {
      probe_id: initialState.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(503, "STORAGE_WRITE_FAILED", "Bildspeicherung fehlgeschlagen.");
  }
  imageBytes.fill(0);

  const submitChanges = await applySubmit(c.env.DB, {
    token_hash: matchedHash,
    now_iso: submitNow,
    submission_ciphertext: submissionCiphertext,
    image_mime: image.type,
    image_bytes: image.size,
    image_uploaded_at: submitNow,
  });

  if (submitChanges === 0) {
    try {
      await c.env.PROBE_IMAGES.delete(imageKey);
      console.info("orphan_cleanup_ok", { probe_id: initialState.id, image_key: imageKey });
    } catch (error) {
      console.error("orphan_cleanup_failed", {
        probe_id: initialState.id,
        image_key: imageKey,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    const stateAfterRace = await findByTokenHashes(c.env.DB, [matchedHash]);
    if (!stateAfterRace) {
      return jsonError(404, "TOKEN_NOT_FOUND", "Link nicht gefunden.");
    }
    return normalizeTokenStateError(stateAfterRace, submitNow);
  }

  console.info("submit_accepted", { probe_id: initialState.id, state: "accepted" });

  return c.json(
    {
      probe_id: initialState.id,
      submitted_at: submitNow,
      status: "eingereicht",
    },
    201,
  );
});

app.all("*", async (c) => {
  if (c.req.path.startsWith("/api/")) {
    const methodPolicyError = enforceKnownApiMethod(c.req.method, c.req.path);
    if (methodPolicyError) {
      return methodPolicyError;
    }
    return jsonError(404, "NOT_FOUND", "Ressource nicht gefunden.");
  }

  const appShellOptions = {
    varyByAccessIdentity: c.req.path === "/admin" || c.req.path.startsWith("/admin/"),
  };

  if (c.env.ASSETS) {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (isAppShellRoute(c.req.path)) {
      return withAppShellResponseHeaders(assetResponse, appShellOptions);
    }
    return assetResponse;
  }

  const response = c.html(
    `<!doctype html><html lang="de-CH"><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  );
  if (isAppShellRoute(c.req.path)) {
    applyAppShellHeaders(response.headers, appShellOptions);
  }
  return response;
});

export default app;
