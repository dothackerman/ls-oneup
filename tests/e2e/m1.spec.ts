import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test("E2E-ADMIN-001 and E2E-ADMIN-002 create links and render frontend QR", async ({ page }) => {
  await page.goto("/admin");

  await page.getByLabel("Kunde").fill("E2E Kunde");
  await page.getByLabel("Auftragsnummer").fill(`E2E-${Date.now()}`);
  await page.getByLabel("Anzahl Probes").fill("1");
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
  await expect(page.getByText("Ohne Internet ist Senden in M1 nicht moeglich.")).toBeVisible();
});
