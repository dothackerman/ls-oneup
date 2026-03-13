import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, type ProbeStatus } from "../src/shared/domain";
import { jsonError } from "../src/shared/errors";
import {
  createProbesSchema,
  cropOverrideSchema,
  farmerSubmitFieldsSchema,
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
  TokenSecurityConfigError,
  generateToken,
  hashTokenForStorage,
  matchStoredTokenHash,
  tokenHashCandidates,
} from "./security";
import {
  SubmissionSecurityConfigError,
  decryptSubmissionPayload,
  encryptSubmissionPayload,
} from "./submission-security";
import type { Env } from "./types";

type WorkerEnv = Env & {
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: WorkerEnv }>();

const TOKEN_USED_MESSAGE = "Link wurde bereits verwendet.";
const TOKEN_EXPIRED_MESSAGE = "Link ist abgelaufen.";

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

function normalizeStatusError(
  tokenState: { submitted_at: string | null; expire_by: string },
  now: string,
): Response {
  if (tokenState.submitted_at) {
    return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
  }
  if (tokenState.expire_by <= now) {
    return jsonError(410, "TOKEN_EXPIRED", TOKEN_EXPIRED_MESSAGE);
  }
  return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
}

function handleCryptoSecurityError(scope: "token" | "submission", error: unknown): Response {
  console.error("crypto_security_error", {
    scope,
    error:
      error instanceof TokenSecurityConfigError ||
      error instanceof SubmissionSecurityConfigError ||
      error instanceof Error
        ? error.message
        : "unknown",
  });
  return jsonError(503, "SECURITY_UNAVAILABLE", "Sicherheitsprüfung temporär nicht verfügbar.");
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
    return;
  }

  const user = c.req.header("Cf-Access-Authenticated-User-Email");
  if (!user) {
    c.status(401 as ContentfulStatusCode);
    return c.json({ error_code: "ACCESS_REQUIRED", message: "Admin-Zugriff erforderlich." });
  }

  await next();
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

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=60");
  headers.set("content-type", headers.get("content-type") ?? imageRef.image_mime ?? "image/jpeg");
  headers.set("content-disposition", "inline");

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
    return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
  }

  if (state.expire_by <= now) {
    return jsonError(410, "TOKEN_EXPIRED", TOKEN_EXPIRED_MESSAGE);
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

  if (initialState.submitted_at) {
    return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
  }

  if (initialState.expire_by <= startNow) {
    return jsonError(410, "TOKEN_EXPIRED", TOKEN_EXPIRED_MESSAGE);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return jsonError(400, "VALIDATION_ERROR", "Ungültige Formular-Daten.");
  }

  const imageEntries = formData
    .getAll("image")
    .filter((value): value is File => value instanceof File);

  if (imageEntries.length !== 1) {
    return jsonError(400, "IMAGE_REQUIRED", "Genau ein Bild ist erforderlich.");
  }

  const image = imageEntries[0];

  if (!ALLOWED_IMAGE_MIME.includes(image.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return jsonError(415, "INVALID_IMAGE_MIME", "Nur JPEG oder PNG sind erlaubt.");
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonError(413, "IMAGE_TOO_LARGE", "Bild ist grösser als 2 MB.");
  }

  const parsed = farmerSubmitFieldsSchema.safeParse({
    crop_name: formData.get("crop_name"),
    vitality: formData.get("vitality"),
    soil_moisture: formData.get("soil_moisture"),
    gps_lat: formData.get("gps_lat"),
    gps_lon: formData.get("gps_lon"),
    gps_captured_at: formData.get("gps_captured_at"),
  });

  if (!parsed.success) {
    const invalidFields = new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "")));

    if (invalidFields.has("crop_name")) {
      return jsonError(400, "VALIDATION_ERROR", "Kulturname ist obligatorisch.");
    }
    if (invalidFields.has("vitality")) {
      return jsonError(400, "VALIDATION_ERROR", "Pflanzenvitalität ist obligatorisch.");
    }
    if (invalidFields.has("soil_moisture")) {
      return jsonError(400, "VALIDATION_ERROR", "Bodennässe ist obligatorisch.");
    }
    if (
      invalidFields.has("gps_lat") ||
      invalidFields.has("gps_lon") ||
      invalidFields.has("gps_captured_at")
    ) {
      return jsonError(400, "VALIDATION_ERROR", "GPS-Daten fehlen oder sind ungültig.");
    }

    return jsonError(400, "VALIDATION_ERROR", "Pflichtfelder fehlen oder sind ungültig.");
  }

  const extension = image.type === "image/png" ? "png" : "jpg";
  const imageKey = `${initialState.id}/${crypto.randomUUID()}.${extension}`;
  let submissionCiphertext: string;
  try {
    submissionCiphertext = await encryptSubmissionPayload(
      {
        crop_name: parsed.data.crop_name,
        plant_vitality: parsed.data.vitality,
        soil_moisture: parsed.data.soil_moisture,
        gps_lat: parsed.data.gps_lat,
        gps_lon: parsed.data.gps_lon,
        gps_captured_at: parsed.data.gps_captured_at,
        image_key: imageKey,
      },
      c.env,
    );
  } catch (error) {
    return handleCryptoSecurityError("submission", error);
  }

  try {
    await c.env.PROBE_IMAGES.put(imageKey, image.stream(), {
      httpMetadata: {
        contentType: image.type,
      },
    });
  } catch (error) {
    console.error("r2_upload_failed", {
      probe_id: initialState.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(503, "STORAGE_WRITE_FAILED", "Bildspeicherung fehlgeschlagen.");
  }

  const submitNow = nowIso();

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
    return normalizeStatusError(stateAfterRace, submitNow);
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
    return jsonError(404, "NOT_FOUND", "Ressource nicht gefunden.");
  }

  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.html(
    `<!doctype html><html lang="de-CH"><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  );
});

export default app;
