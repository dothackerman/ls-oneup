import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { buildValidForm, createProbeOrder, tokenFromUrl } from "./helpers";
import { hashTokenForStorage, legacyPlainTokenHash } from "../../worker/security";
import { decryptSubmissionImageBytes } from "../../worker/submission-security";

describe("M1 integration", () => {
  it("INT-EDGE-001 serves admin shell with browser security headers", async () => {
    const response = await SELF.fetch("https://example.test/admin");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("vary")).toContain("Cf-Access-Authenticated-User-Email");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("INT-EDGE-002 serves token shell with browser security headers", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-SHELL" });
    const token = tokenFromUrl(tokenUrl);

    const response = await SELF.fetch(`https://example.test/p/${token}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("permissions-policy")).toContain("geolocation=(self)");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

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
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("vary")).toContain("Cf-Access-Authenticated-User-Email");
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

  it("INT-UPLOAD-002 rejects spoofed image content", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-UPLOAD-SPOOF" });
    const token = tokenFromUrl(tokenUrl);

    const spoofedForm = buildValidForm();
    spoofedForm.delete("image");
    spoofedForm.append(
      "image",
      new File(
        [Uint8Array.from([110, 111, 116, 45, 97, 110, 45, 105, 109, 97, 103, 101])],
        "fake.jpg",
        {
          type: "image/jpeg",
        },
      ),
    );

    const response = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: spoofedForm,
    });

    expect(response.status).toBe(415);
    expect((await response.json()) as { error_code: string }).toMatchObject({
      error_code: "INVALID_IMAGE_CONTENT",
    });
  });

  it("INT-UPLOAD-003 rejects embedded image metadata", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-UPLOAD-METADATA" });
    const token = tokenFromUrl(tokenUrl);

    const metadataForm = buildValidForm();
    metadataForm.delete("image");
    metadataForm.append(
      "image",
      new File(
        [
          Uint8Array.from([
            0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x41, 0x42,
            0x43, 0x44, 0x45, 0x46, 0xff, 0xd9,
          ]),
        ],
        "metadata.jpg",
        {
          type: "image/jpeg",
        },
      ),
    );

    const response = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: metadataForm,
    });

    expect(response.status).toBe(415);
    expect((await response.json()) as { error_code: string }).toMatchObject({
      error_code: "IMAGE_METADATA_NOT_ALLOWED",
    });
  });

  it("INT-METHOD-001 returns 405 for unsupported methods on known routes", async () => {
    const { tokenUrl, probeId } = await createProbeOrder({ order_number: "ORD-METHOD" });
    const token = tokenFromUrl(tokenUrl);

    const submitGet = await SELF.fetch(`https://example.test/api/probe/${token}/submit`);
    expect(submitGet.status).toBe(405);
    expect(submitGet.headers.get("allow")).toBe("POST");

    const imagePost = await SELF.fetch(`https://example.test/api/admin/probes/${probeId}/image`, {
      method: "POST",
    });
    expect(imagePost.status).toBe(405);
    expect(imagePost.headers.get("allow")).toBe("GET");
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
    expect(openResponse.headers.get("cache-control")).toBe("no-store");
    expect(openResponse.headers.get("pragma")).toBe("no-cache");
    expect(openResponse.headers.get("expires")).toBe("0");

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

  it("INT-DATA-004 stores uploaded image bytes encrypted in R2", async () => {
    const { tokenUrl } = await createProbeOrder({ order_number: "ORD-IMAGE-ENCRYPTED" });
    const token = tokenFromUrl(tokenUrl);

    const originalImageBytes = Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);
    const form = buildValidForm();
    form.delete("image");
    form.append("image", new File([originalImageBytes], "probe.jpg", { type: "image/jpeg" }));

    const submit = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
      method: "POST",
      body: form,
    });
    expect(submit.status).toBe(201);

    const listed = await env.PROBE_IMAGES.list();
    expect(listed.objects).toHaveLength(1);

    const obj = await env.PROBE_IMAGES.get(listed.objects[0].key);
    expect(obj).not.toBeNull();

    const metadata = new Headers();
    obj?.writeHttpMetadata(metadata);
    expect(metadata.get("content-type")).toBe("application/vnd.ls-oneup.encrypted-image+json");
    expect(
      (obj as { customMetadata?: Record<string, string> } | null)?.customMetadata,
    ).toMatchObject({
      retention_class: "submitted_probe_artifact",
      image_metadata_policy: "reject_embedded_metadata",
    });
    expect(
      (obj as { customMetadata?: Record<string, string> } | null)?.customMetadata?.["delete_after"],
    ).toBeTruthy();

    const storedEnvelope = await obj?.text();
    expect(storedEnvelope?.includes('"version":"b1"')).toBe(true);
    expect(storedEnvelope?.includes('"ciphertext"')).toBe(true);

    const decrypted = await decryptSubmissionImageBytes(storedEnvelope ?? "", env);
    expect(Array.from(decrypted)).toEqual(Array.from(originalImageBytes));
    decrypted.fill(0);
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

  it("INT-DATA-001 rejects API submit payloads for all required submit-time constraints", async () => {
    const oversizedBytes = new Uint8Array(2 * 1024 * 1024 + 1);
    const invalidCases: Array<{
      name: string;
      mutate: (form: FormData) => void;
    }> = [
      {
        name: "missing crop_name without submission_ciphertext",
        mutate: (form) => {
          form.delete("crop_name");
        },
      },
      {
        name: "invalid plant_vitality enum",
        mutate: (form) => {
          form.set("vitality", "ungueltig");
        },
      },
      {
        name: "invalid soil_moisture enum",
        mutate: (form) => {
          form.set("soil_moisture", "ungueltig");
        },
      },
      {
        name: "gps_lat out of range",
        mutate: (form) => {
          form.set("gps_lat", "90.01");
        },
      },
      {
        name: "gps_lon out of range",
        mutate: (form) => {
          form.set("gps_lon", "180.01");
        },
      },
      {
        name: "missing gps_captured_at",
        mutate: (form) => {
          form.delete("gps_captured_at");
        },
      },
      {
        name: "missing image_key equivalent (image omitted)",
        mutate: (form) => {
          form.delete("image");
        },
      },
      {
        name: "invalid image_mime",
        mutate: (form) => {
          form.delete("image");
          form.append(
            "image",
            new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }),
          );
        },
      },
      {
        name: "image_bytes out of range",
        mutate: (form) => {
          form.delete("image");
          form.append("image", new File([oversizedBytes], "large.jpg", { type: "image/jpeg" }));
        },
      },
      {
        name: "missing image_uploaded_at equivalent (no file entry)",
        mutate: (form) => {
          form.delete("image");
          form.set("image", "not-a-file");
        },
      },
    ];

    await Promise.all(
      invalidCases.map(async (invalidCase) => {
        const { tokenUrl } = await createProbeOrder();
        const token = tokenFromUrl(tokenUrl);
        const form = buildValidForm();
        invalidCase.mutate(form);

        const response = await SELF.fetch(`https://example.test/api/probe/${token}/submit`, {
          method: "POST",
          body: form,
        });

        expect(response.status, invalidCase.name).toBeGreaterThanOrEqual(400);
        expect(response.status, invalidCase.name).toBeLessThan(500);
      }),
    );
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
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect(list.headers.get("pragma")).toBe("no-cache");
    expect(list.headers.get("expires")).toBe("0");
    expect(list.headers.get("vary")).toContain("Cf-Access-Authenticated-User-Email");
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
    expect(imageRes.headers.get("cache-control")).toBe("no-store");
    expect(imageRes.headers.get("pragma")).toBe("no-cache");
    expect(imageRes.headers.get("expires")).toBe("0");
    expect(imageRes.headers.get("vary")).toContain("Cf-Access-Authenticated-User-Email");
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
