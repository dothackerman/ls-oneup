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
  await page.getByLabel("Pflanzenvitalität").selectOption("normal");
  await page.getByLabel("Bodenfeuchte").selectOption("normal");
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
  await page.getByLabel("Pflanzenvitalität").selectOption("normal");
  await page.getByLabel("Bodenfeuchte").selectOption("normal");
  await page.getByRole("button", { name: "GPS erfassen" }).click();
  await page.setInputFiles("input[type='file']", {
    name: "probe.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(1024, 1),
  });

  await context.setOffline(true);
  await expect(page.getByText("Keine Internetverbindung erkannt.")).toBeVisible();

  await expect(page.getByRole("button", { name: "Absenden" })).toBeDisabled();
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
    "Erstellt",
    "Eingereicht",
    "Ablauf",
    "Bild",
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
  const previewImage = modal.locator(".image-preview");
  await expect(previewImage).toBeVisible();
  await expect(previewImage).toHaveAttribute("src", /\/api\/admin\/probes\/.+\/image/);

  await modal.getByRole("button", { name: "Schliessen" }).click();
  await expect(modal).toBeHidden();

  await row.getByRole("button", { name: "Anzeigen" }).click();
  await expect(previewImage).toBeVisible();
  expect(imageCalls).toBeGreaterThanOrEqual(1);
  expect(imageCalls).toBeLessThanOrEqual(2);
});

test("E2E-ADMIN-005 stores override timestamp only after submitted status", async ({
  page,
  request,
}) => {
  const { orderNumber, token } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-005",
  });

  await page.goto("/admin");
  let row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.locator(".status")).toHaveText("offen");
  await expect(row.getByRole("button", { name: "Kultur bearbeiten" })).toHaveCount(0);

  const cells = row.locator("td");
  await expect(cells.nth(4)).toContainText("-");
  await expect(cells.nth(5)).toHaveText("-");
  await expect(cells.nth(6)).toHaveText("-");
  await expect(cells.nth(7)).toHaveText("-");
  await expect(cells.nth(11)).toHaveText("-");

  const submitStatus = await submitProbe(request, token);
  expect(submitStatus).toBe(201);

  await page.reload();
  row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.locator(".status")).toHaveText("eingereicht");
  await row.getByRole("button", { name: "Kultur bearbeiten" }).click();
  await expect(row).toContainText("Mit Speichern übernimmt Admin die Verantwortung.");
  await row.getByPlaceholder("Kultur anpassen").fill("Randen");
  await row.getByRole("button", { name: "Speichern" }).click();

  await expect(row).toContainText("Randen");
  await expect(row).toContainText("Override:");
});

test("E2E-FARM-006 requires explicit select choices before submit", async ({
  page,
  request,
  context,
}) => {
  const { token } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-006",
  });

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

  const submitButton = page.getByRole("button", { name: "Absenden" });
  await expect(submitButton).toBeDisabled();

  await page.getByLabel("Pflanzenvitalität").selectOption("normal");
  await expect(submitButton).toBeDisabled();

  await page.getByLabel("Bodenfeuchte").selectOption("normal");
  await expect(submitButton).toBeEnabled();
});

test("E2E-FARM-007 shows loading state while GPS capture runs", async ({
  page,
  request,
  context,
}) => {
  const { token } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-007",
  });

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });

  await page.addInitScript(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) =>
      original(
        (position) => {
          window.setTimeout(() => success(position), 800);
        },
        error,
        options,
      );
  });

  await page.goto(`/p/${token}`);
  await page.getByRole("button", { name: "GPS erfassen" }).click();

  await expect(page.getByRole("button", { name: "GPS wird erfasst..." })).toBeDisabled();
  await expect(page.getByText("Standort wird ermittelt...")).toBeVisible();
  await expect(page.getByText("GPS erfasst:")).toBeVisible({ timeout: 5000 });
});

test("E2E-ADMIN-006 paginates admin table with 20 rows per page", async ({ page, request }) => {
  const orderNumber = `E2E-ADMIN-006-${Date.now()}`;
  const create = await request.post("/api/admin/probes", {
    data: {
      customer_name: "Pagination Kunde",
      order_number: orderNumber,
      probe_count: 25,
    },
  });

  expect(create.status()).toBe(201);
  const list = await request.get("/api/admin/probes");
  expect(list.status()).toBe(200);
  const listPayload = (await list.json()) as { items: Array<{ probe_id: string }> };
  const total = listPayload.items.length;
  const firstPageEnd = Math.min(20, total);

  await page.goto("/admin");
  await expect(page.getByText(`1-${firstPageEnd} von ${total}`)).toHaveCount(2);
  await expect(page.locator("tbody tr")).toHaveCount(20);

  await page.getByRole("button", { name: "Weiter" }).first().click();

  const secondPageEnd = Math.min(40, total);
  await expect(page.getByText(`21-${secondPageEnd} von ${total}`)).toHaveCount(2);
  await expect(page.locator("tbody tr")).toHaveCount(secondPageEnd - 20);
  if (total > 40) {
    await expect(page.getByRole("button", { name: "Weiter" }).first()).toBeEnabled();
  } else {
    await expect(page.getByRole("button", { name: "Weiter" }).first()).toBeDisabled();
  }
  await expect(page.getByRole("button", { name: "Zurück" }).first()).toBeEnabled();
});

test("E2E-ADMIN-007 keeps Bild action visible on narrow screens", async ({ page, request }) => {
  const { orderNumber, token } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-007",
  });
  const submitStatus = await submitProbe(request, token);
  expect(submitStatus).toBe(201);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");

  const scrollContainer = page.getByTestId("admin-table-scroll");
  await scrollContainer.evaluate((element) => {
    element.scrollLeft = 0;
  });

  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("button", { name: "Anzeigen" })).toBeVisible();
});
