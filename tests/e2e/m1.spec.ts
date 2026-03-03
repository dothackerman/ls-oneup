import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { createProbeOrder, expireProbeById, submitProbe } from "./helpers";

test("E2E-ADMIN-001 and E2E-ADMIN-002 create links and render frontend QR", async ({ page }) => {
  await page.goto("/admin");

  await page.getByLabel("Kunde").fill("E2E Kunde");
  await page.getByLabel("Auftragsnummer").fill(`E2E-${Date.now()}`);
  await page.getByLabel("Anzahl Proben").fill("1");
  await page.getByRole("button", { name: "Links erstellen" }).click();

  await expect(page.getByText("QR-Codes werden nicht persistiert")).toBeVisible();
  await expect(page.locator("img[alt^='QR Probe']")).toBeVisible();
  await expect(page.getByRole("link", { name: "QR herunterladen" })).toBeVisible();
});

test("E2E-FARM-001 and E2E-FARM-003 submit once then reject second submit", async ({
  page,
  request,
  context,
}) => {
  const order = `E2E-FARM-${Date.now()}`;

  const create = await request.post("/api/admin/probes", {
    data: {
      customer_name: "Farmer Kunde",
      order_number: order,
      probe_count: 1,
    },
  });

  expect(create.status()).toBe(201);
  const payload = (await create.json()) as {
    items: Array<{ token_url: string }>;
  };

  const tokenUrl = payload.items[0].token_url;
  const token = tokenUrl.split("/").pop();
  if (!token) {
    throw new Error("token missing");
  }

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });

  await page.goto(`/p/${token}`);

  await page.getByLabel("Kulturname").fill("Kartoffeln");
  await page.getByRole("button", { name: "GPS erfassen" }).click();

  await page.setInputFiles("input[type='file']", {
    name: "probe.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(1024, 1),
  });

  await page.getByRole("button", { name: "Absenden" }).click();
  await expect(page.getByText("Erfolgreich eingereicht")).toBeVisible();

  const second = await request.post(`/api/probe/${token}/submit`, {
    multipart: {
      crop_name: "Kartoffeln",
      vitality: "normal",
      soil_moisture: "normal",
      gps_lat: "47.3769",
      gps_lon: "8.5417",
      gps_captured_at: new Date().toISOString(),
      image: {
        name: "probe.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.alloc(1024, 1),
      },
    },
  });

  expect(second.status()).toBe(409);
});

test("E2E-FARM-004 blocks submit when offline", async ({ page, request, context }) => {
  const order = `E2E-OFFLINE-${Date.now()}`;

  const create = await request.post("/api/admin/probes", {
    data: {
      customer_name: "Offline Kunde",
      order_number: order,
      probe_count: 1,
    },
  });
  expect(create.status()).toBe(201);

  const payload = (await create.json()) as {
    items: Array<{ token_url: string }>;
  };
  const token = payload.items[0].token_url.split("/").pop();
  if (!token) {
    throw new Error("token missing");
  }

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });

  await page.goto(`/p/${token}`);
  await page.getByLabel("Kulturname").fill("Kartoffeln");
  await page.getByRole("button", { name: "GPS erfassen" }).click();
  await page.setInputFiles("input[type='file']", {
    name: "probe.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(1024, 1),
  });

  await context.setOffline(true);
  await expect(page.getByText("Keine Internetverbindung erkannt.")).toBeVisible();

  await page.getByRole("button", { name: "Absenden" }).click();
  await expect(page.getByText("Ohne Internet ist Senden in M1 nicht möglich.")).toBeVisible();
});

test("E2E-ADMIN-003 shows submitted probes with status eingereicht", async ({ page, request }) => {
  const { orderNumber, token } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-003",
  });

  const submitStatus = await submitProbe(request, token);
  expect(submitStatus).toBe(201);

  await page.goto("/admin");
  const headers = await page
    .locator("thead th")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? ""));
  expect(headers).toEqual([
    "Kunde",
    "Auftrag",
    "Probe",
    "Status",
    "Kultur",
    "Pflanzenvitalität",
    "Bodennässe",
    "GPS",
    "Bild",
    "Erstellt",
    "Eingereicht",
    "Ablauf",
  ]);

  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.locator(".status")).toHaveText("eingereicht");
  await expect(row).toContainText("Kartoffeln");
  await expect(row).toContainText("normal");
  await expect(row).toContainText("47.37690, 8.54170");
});

test("E2E-FARM-002 blocks expired tokens in farmer flow", async ({ page, request }) => {
  const { token, probeId } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-002",
  });

  await expireProbeById(probeId);

  await page.goto(`/p/${token}`);
  await expect(page.getByText("Link ist abgelaufen.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Absenden" })).toHaveCount(0);
});

test("E2E-FARM-005 rejects invalid MIME and oversized uploads", async ({ request }) => {
  const { token: badMimeToken } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-005-MIME",
  });

  const badMimeStatus = await submitProbe(request, badMimeToken, {
    image: {
      name: "not-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not-an-image"),
    },
  });
  expect(badMimeStatus).toBe(415);

  const { token: oversizedToken } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-005-SIZE",
  });

  const oversizedStatus = await submitProbe(request, oversizedToken, {
    image: {
      name: "too-large.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 1),
    },
  });
  expect(oversizedStatus).toBe(413);
});

test("E2E-ADMIN-004 allows viewing uploaded image from admin table", async ({ page, request }) => {
  const { orderNumber, token } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-004",
  });

  const submitStatus = await submitProbe(request, token);
  expect(submitStatus).toBe(201);

  let imageCalls = 0;
  await page.route("**/api/admin/probes/*/image", async (route) => {
    imageCalls += 1;
    await route.continue();
  });

  await page.goto("/admin");
  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);

  await expect(row.getByRole("link", { name: "Anzeigen" })).toHaveCount(0);
  await row.getByRole("button", { name: "Anzeigen" }).click();

  const modal = page.getByRole("dialog", { name: /Bildvorschau Probe/ });
  await expect(modal).toBeVisible();
  await expect(modal.locator(".image-preview")).toBeVisible();

  await modal.getByRole("button", { name: "Schliessen" }).click();
  await expect(modal).toBeHidden();

  await row.getByRole("button", { name: "Anzeigen" }).click();
  await expect(modal.locator(".image-preview")).toBeVisible();
  expect(imageCalls).toBe(1);
});

test("E2E-ADMIN-005 stores and shows crop override timestamp", async ({ page, request }) => {
  const { orderNumber } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-005",
  });

  await page.goto("/admin");
  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.locator(".status")).toHaveText("offen");

  const cells = row.locator("td");
  await expect(cells.nth(5)).toHaveText("-");
  await expect(cells.nth(6)).toHaveText("-");
  await expect(cells.nth(7)).toHaveText("-");
  await expect(cells.nth(8)).toHaveText("-");
  await expect(cells.nth(10)).toHaveText("-");

  await expect(page.getByRole("columnheader", { name: "Override" })).toHaveCount(0);
  await row.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(row).toContainText("Mit Speichern übernimmt Admin die Verantwortung.");
  await row.getByPlaceholder("Kultur anpassen").fill("Randen");
  await row.getByRole("button", { name: "Speichern" }).click();

  await expect(row).toContainText("Randen");
  await expect(row).toContainText("Override:");
});
