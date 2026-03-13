import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { buildValidForm, createProbeOrder, tokenFromUrl } from "./helpers";
import { hashTokenForStorage, legacyPlainTokenHash } from "../../worker/security";

async function expectD1Failure(run: () => Promise<unknown>): Promise<void> {
  let failed = false;
  try {
    await run();
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
}

describe("M1 integration", () => {
  it("INT-ADMIN-001 creates probes and links in one flow", async () => {
    const response = await SELF.fetch("https://example.test/api/admin/probes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customer_name: "Kunde INT",
        order_number: "ORD-100",
        probe_count: 3,
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      items: Array<{
        probe_number: number;
        token_url: string;
        created_at: string;
        expire_by: string;
      }>;
    };

    expect(payload.items).toHaveLength(3);
    expect(payload.items.map((i) => i.probe_number)).toEqual([1, 2, 3]);
    expect(payload.items[0].token_url).toContain("/p/");
    expect(payload.items[0].created_at < payload.items[0].expire_by).toBe(true);
  });

  it("INT-LINK-001 ensures one active link per probe in M1", async () => {
    const requestBody = {
      customer_name: "Kunde Dup",
      order_number: "ORD-DUP",
      probe_count: 1,
    };

    const first = await SELF.fetch("https://example.test/api/admin/probes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const second = await SELF.fetch("https://example.test/api/admin/probes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it("INT-SUBMIT-001 blocks submit without mandatory fields and one image", async () => {
    const { tokenUrl } = await createProbeOrder();
    const token = tokenFromUrl(tokenUrl);

    const form = new FormData();
    form.set("crop_name", "Kartoffeln");

    const response = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
  });

  it("INT-UPLOAD-001 rejects bad mime and oversized files", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-UPLOAD-A" });
    const tokenA = tokenFromUrl(tokenUrl);

    const badMimeForm = buildValidForm();
    badMimeForm.delete("image");
    badMimeForm.append(
      "image",
      new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }),
    );

    const mimeRes = await SELF.fetch(`https://example.test/api/probe/${tokenA}/submit`, {
      method: "POST",
      body: badMimeForm,
    });

    expect(mimeRes.status).toBe(415);

    const b = new Uint8Array(2 * 1024 * 1024 + 1);
    crypto.getRandomValues(b.subarray(0, 65536));

    const { tokenUrl: tokenUrlB } = await createProbeOrder({ order_number: "ORD-UPLOAD-B" });
    const tokenB = tokenFromUrl(tokenUrlB);

    const largeForm = buildValidForm();
    largeForm.delete("image");
    largeForm.append("image", new File([b], "large.jpg", { type: "image/jpeg" }));

    const sizeRes = await SELF.fetch(`https://example.test/api/probe/${tokenB}/submit`, {
      method: "POST",
      body: largeForm,
    });

    expect(sizeRes.status).toBe(413);
  });

  it("INT-SUBMIT-002 used link cannot submit again", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-USED" });
    const token = tokenFromUrl(tokenUrl);

    const first = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });

    const second = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it("INT-LINK-002 expires links after TTL", async () => {
    const { tokenUrl, probeId } = await createProbeOrder({ order_number: "ORD-EXP" });
    const token = tokenFromUrl(tokenUrl);

    await env.DB.prepare("UPDATE probes SET expire_by = ?1 WHERE id = ?2")
      .bind("2000-01-01T00:00:00.000Z", probeId)
      .run();

    const response = await SELF.fetch(`https://example.test/api/probe/${token}`);
    expect(response.status).toBe(410);
  });

  it("INT-LINK-003 accepts legacy token hashes during rotation window", async () => {
    const { tokenUrl, probeId } = await createProbeOrder({ order_number: "ORD-LEGACY" });
    const token = tokenFromUrl(tokenUrl);
    const legacyHash = await legacyPlainTokenHash(
      token,
      "test-token-secret-0123456789abcdefghijklmnopqrstuvwxyz",
    );

    await env.DB.prepare("UPDATE probes SET token_hash = ?1 WHERE id = ?2")
      .bind(legacyHash, probeId)
      .run();

    const openResponse = await SELF.fetch(`https://example.test/api/probe/${token}`);
    expect(openResponse.status).toBe(200);

    const submitResponse = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });
    expect(submitResponse.status).toBe(201);
  });

  it("INT-LINK-004 rejects token hashing when no HMAC key configuration exists", async () => {
    await expect(hashTokenForStorage("test-token", {})).rejects.toThrowError(
      "Missing token HMAC key configuration.",
    );
  });

  it("INT-DATA-003 stores submitted probe payload encrypted at rest", async () => {
    const { tokenUrl, probeId } = await createProbeOrder({ order_number: "ORD-ENCRYPTED" });
    const token = tokenFromUrl(tokenUrl);

    const submit = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });
    expect(submit.status).toBe(201);

    const row = await env.DB.prepare(
      `SELECT crop_name,
              plant_vitality,
              soil_moisture,
              gps_lat,
              gps_lon,
              image_key,
              submission_ciphertext,
              image_mime,
              image_bytes
         FROM probes
        WHERE id = ?1`,
    )
      .bind(probeId)
      .first<{
        crop_name: string | null;
        plant_vitality: string | null;
        soil_moisture: string | null;
        gps_lat: number | null;
        gps_lon: number | null;
        image_key: string | null;
        submission_ciphertext: string | null;
        image_mime: string | null;
        image_bytes: number | null;
      }>();

    expect(row?.crop_name ?? null).toBeNull();
    expect(row?.plant_vitality ?? null).toBeNull();
    expect(row?.soil_moisture ?? null).toBeNull();
    expect(row?.gps_lat ?? null).toBeNull();
    expect(row?.gps_lon ?? null).toBeNull();
    expect(row?.image_key ?? null).toBeNull();
    expect(row?.submission_ciphertext?.includes('"ciphertext"')).toBe(true);
    expect(row?.image_mime).toBe("image/jpeg");
    expect((row?.image_bytes ?? 0) > 0).toBe(true);
  });

  it("INT-SUBMIT-003 first-submit-wins with race and cleanup", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-RACE" });
    const token = tokenFromUrl(tokenUrl);

    const [a, b] = await Promise.all([
      SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
        method: "POST",
        body: buildValidForm(),
      }),
      SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
        method: "POST",
        body: buildValidForm(),
      }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);

    const listed = await env.PROBE_IMAGES.list();
    expect(listed.objects.length).toBe(1);
  });

  it("INT-DATA-001 blocks DB submit-state updates with missing mandatory farmer fields", async () => {
    const { probeId } = await createProbeOrder({ order_number: "ORD-DATA-REQ" });
    const now = new Date().toISOString();

    await expectD1Failure(() =>
      env.DB.prepare("UPDATE probes SET submitted_at = ?1 WHERE id = ?2").bind(now, probeId).run(),
    );

    const row = await env.DB.prepare("SELECT submitted_at FROM probes WHERE id = ?1")
      .bind(probeId)
      .first<{ submitted_at: string | null }>();

    expect(row?.submitted_at ?? null).toBeNull();
  });

  it("INT-DATA-002 blocks DB submit-state updates with invalid enum and MIME values", async () => {
    const { probeId } = await createProbeOrder({ order_number: "ORD-DATA-ENUM" });
    const now = new Date().toISOString();

    await expectD1Failure(() =>
      env.DB.prepare(
        `UPDATE probes
         SET submitted_at = ?1,
             crop_name = 'Kartoffeln',
             plant_vitality = 'ungueltig',
             soil_moisture = 'normal',
             gps_lat = 47.3769,
             gps_lon = 8.5417,
             gps_captured_at = ?2,
             image_key = 'img/test.jpg',
             image_mime = 'image/gif',
             image_bytes = 1000,
             image_uploaded_at = ?3
         WHERE id = ?4`,
      )
        .bind(now, now, now, probeId)
        .run(),
    );

    const row = await env.DB.prepare("SELECT submitted_at FROM probes WHERE id = ?1")
      .bind(probeId)
      .first<{ submitted_at: string | null }>();

    expect(row?.submitted_at ?? null).toBeNull();
  });

  it("INT-STATUS-001 and INT-ADMIN-002 expose submitted status and image view", async () => {
    const { tokenUrl, probeId } = await createProbeOrder({ order_number: "ORD-STATUS" });
    const token = tokenFromUrl(tokenUrl);

    const submit = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });
    expect(submit.status).toBe(201);

    const list = await SELF.fetch("https://example.test/api/admin/probes?order_number=ORD-STATUS");
    expect(list.status).toBe(200);
    const listPayload = (await list.json()) as { items: AdminProbeList[] };
    expect(listPayload.items[0].status).toBe("eingereicht");
    expect(listPayload.items[0].crop_name).toBe("Kartoffeln");
    expect(listPayload.items[0].plant_vitality).toBe("normal");
    expect(listPayload.items[0].soil_moisture).toBe("normal");
    expect(listPayload.items[0].gps_lat).toBeCloseTo(47.3769, 5);
    expect(listPayload.items[0].gps_lon).toBeCloseTo(8.5417, 5);
    expect(listPayload.items[0].gps_captured_at).toBeTruthy();
    expect(listPayload.items[0].image_url).toContain(`/api/admin/probes/${probeId}/image`);

    const imageRes = await SELF.fetch(`https://example.test/api/admin/probes/${probeId}/image`);
    expect(imageRes.status).toBe(200);
    expect(imageRes.headers.get("content-type")).toContain("image/");
    expect(imageRes.headers.get("content-disposition")).toContain("inline");
    await imageRes.arrayBuffer();
  });

  it("INT-ADMIN-003 allows crop override only for submitted probes", async () => {
    const { probeId, tokenUrl } = await createProbeOrder({ order_number: "ORD-OVERRIDE" });
    const token = tokenFromUrl(tokenUrl);

    const blocked = await SELF.fetch(
      `https://example.test/api/admin/probes/${probeId}/crop-override`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ crop_name: "Randen" }),
      },
    );

    expect(blocked.status).toBe(409);
    const blockedPayload = (await blocked.json()) as { error_code: string };
    expect(blockedPayload.error_code).toBe("PROBE_NOT_SUBMITTED");

    const submit = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: buildValidForm(),
    });
    expect(submit.status).toBe(201);

    const response = await SELF.fetch(
      `https://example.test/api/admin/probes/${probeId}/crop-override`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ crop_name: "Randen" }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { crop_name: string; crop_overridden_at: string };
    expect(payload.crop_name).toBe("Randen");
    expect(payload.crop_overridden_at).toBeTruthy();
  });
});

type AdminProbeList = {
  probe_id: string;
  status: "offen" | "eingereicht" | "abgelaufen";
  crop_name: string | null;
  plant_vitality: "normal" | "schwach_langsam" | "krankheit_oder_anderes_problem" | null;
  soil_moisture: "sehr_trocken" | "trocken" | "normal" | "nass" | "sehr_nass" | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_captured_at: string | null;
  image_url: string | null;
};
