import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import {
  buildTinyPng4x4ImagePayload,
  createProbeOrder,
  expireProbeById,
  submitProbe,
} from "./helpers";

async function chooseSelectOption(page: Page, label: string, optionText: string): Promise<void> {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

test("E2E-ADMIN-001 and E2E-ADMIN-002 create links and render frontend QR", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {},
      },
    });
  });

  await page.goto("/admin?onboarding=off");

  await page.getByLabel("Kunde").fill("E2E Kunde");
  await page.getByLabel("Auftragsnummer").fill(`E2E-${Date.now()}`);
  await page.getByLabel("Anzahl Proben").fill("1");
  await page.getByRole("button", { name: "Links erstellen" }).click();

  await expect(page.getByText("QR-Codes werden nicht persistiert")).toBeVisible();
  await expect(page.locator("img[alt^='QR Probe']")).toBeVisible();
  await expect(page.getByRole("link", { name: "QR herunterladen" })).toBeVisible();

  const copyButton = page.getByRole("button", { name: "Link kopieren" });
  await copyButton.click();
  await expect(page.getByRole("button", { name: "Kopiert" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Link kopieren" })).toBeVisible({ timeout: 5000 });

  await expect(page.getByRole("button", { name: "Links erstellen" })).toHaveCSS(
    "cursor",
    "pointer",
  );
  const prevButton = page.getByRole("button", { name: "Zurück" }).first();
  await expect(prevButton).toBeDisabled();
  await expect(prevButton).toHaveCSS("cursor", "not-allowed");
});

test("E2E-ADMIN-008 onboarding appears once and force mode reopens it", async ({ page }) => {
  await page.goto("/admin");

  const onboardingDialog = page.getByRole("dialog", { name: "Admin Einführung" });
  await expect(onboardingDialog).toBeVisible();
  await expect(onboardingDialog).toContainText("Schritt 1 von");

  await onboardingDialog.getByRole("button", { name: "Überspringen" }).click();
  await expect(onboardingDialog).toBeHidden();

  await page.goto("/admin");
  await expect(page.getByRole("dialog", { name: "Admin Einführung" })).toHaveCount(0);

  await page.goto("/admin?onboarding=force");
  await expect(page.getByRole("dialog", { name: "Admin Einführung" })).toBeVisible();
});

test("E2E-ADMIN-010 onboarding spotlight highlights the current feature", async ({ page }) => {
  await page.goto("/admin?onboarding=force");

  const dialog = page.getByRole("dialog", { name: "Admin Einführung" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("[data-slot='spotlight-overlay']")).toBeVisible();

  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog).toContainText("Schritt 2 von");

  const spotlight = page.locator("[data-slot='spotlight-overlay']");
  await expect(spotlight).toBeVisible();

  const themeToggle = page.locator("[data-onboarding='theme-toggle']");
  await expect(themeToggle).toBeVisible();
  await expect(themeToggle).toHaveCSS("z-index", "45");
});

test("E2E-ADMIN-011 onboarding cannot be dismissed accidentally", async ({ page }) => {
  await page.goto("/admin?onboarding=force");

  const dialog = page.getByRole("dialog", { name: "Admin Einführung" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await page.mouse.click(10, 10);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Überspringen" }).click();
  await expect(dialog).toBeHidden();
});

test("E2E-ADMIN-012 header text remains readable in dark mode", async ({ page }) => {
  await page.goto("/admin?onboarding=off");
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });

  const title = page.getByRole("heading", { name: "Leaf Sap One Up" });
  const subtitle = page.getByText("Adminbereich");
  await expect(title).toBeVisible();
  await expect(subtitle).toBeVisible();

  const backgroundImage = await page.evaluate(
    () => window.getComputedStyle(document.body).backgroundImage,
  );
  expect(backgroundImage).toContain("rgb(38, 77, 58)");
  expect(backgroundImage).toContain("rgb(16, 23, 21)");
});

test("E2E-ADMIN-013 form validation messages appear in German", async ({ page }) => {
  await page.goto("/admin?onboarding=off");

  await page.getByLabel("Auftragsnummer").fill("TEST-123");
  await page.getByRole("button", { name: "Links erstellen" }).click();

  const customerError = page.locator("[data-slot='field-error']").first();
  await expect(customerError).toBeVisible();
  await expect(customerError).toContainText("Bitte geben Sie den Kundennamen ein.");
});

test("E2E-ADMIN-014 theme selector switches between dark and light mode", async ({ page }) => {
  await page.goto("/admin?onboarding=off");

  const themeSelector = page.getByRole("combobox", { name: "Farbmodus" });
  await expect(themeSelector).toBeVisible();

  await themeSelector.click();
  await page.getByRole("option", { name: "Dunkel" }).click();

  await expect(page.getByRole("combobox", { name: "Farbmodus" })).toContainText("Dunkel");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await page.getByRole("combobox", { name: "Farbmodus" }).click();
  await page.getByRole("option", { name: "Hell" }).click();

  await expect(page.getByRole("combobox", { name: "Farbmodus" })).toContainText("Hell");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(false);
});

test("E2E-ADMIN-009 applies dark mode only on /admin", async ({ page, request }) => {
  const create = await request.post("/api/admin/probes", {
    data: {
      customer_name: "Theme Scope Kunde",
      order_number: `THEME-${Date.now()}`,
      probe_count: 1,
    },
  });
  expect(create.status()).toBe(201);
  const payload = (await create.json()) as { items: Array<{ token_url: string }> };
  const token = payload.items[0].token_url.split("/").pop();
  if (!token) {
    throw new Error("token missing");
  }

  await page.goto("/admin?onboarding=off");
  await page.evaluate(() => window.localStorage.setItem("ls-oneup-admin-theme", "dark"));
  await page.reload();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);

  await page.goto(`/p/${token}`);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(false);
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
  await chooseSelectOption(page, "Pflanzenvitalität", "normal");
  await chooseSelectOption(page, "Bodenfeuchte", "normal");
  await page.getByRole("button", { name: "GPS erfassen" }).click();

  await page.setInputFiles("input[type='file']", buildTinyPng4x4ImagePayload());

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
      image: buildTinyPng4x4ImagePayload(),
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
  await chooseSelectOption(page, "Pflanzenvitalität", "normal");
  await chooseSelectOption(page, "Bodenfeuchte", "normal");
  await page.getByRole("button", { name: "GPS erfassen" }).click();
  await page.setInputFiles("input[type='file']", buildTinyPng4x4ImagePayload());

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

  await page.goto("/admin?onboarding=off");
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

  const { token: spoofedToken } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-005-SPOOF",
  });

  const spoofedStatus = await submitProbe(request, spoofedToken, {
    image: {
      name: "fake.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not-an-image"),
    },
  });
  expect(spoofedStatus).toBe(415);
});

test("E2E-FARM-008 returns 405 on unsupported submit methods", async ({ request }) => {
  const { token } = await createProbeOrder(request, {
    orderPrefix: "E2E-FARM-007",
  });

  const response = await request.get(`/api/probe/${token}/submit`);
  expect(response.status()).toBe(405);
  expect(response.headers().allow).toBe("POST");
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

  await page.goto("/admin?onboarding=off");
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

  await page.goto("/admin?onboarding=off");
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
  await expect(row).toContainText("Enter speichert, Esc verwirft.");
  await row.getByPlaceholder("Kultur anpassen").fill("Randen");
  await row.getByPlaceholder("Kultur anpassen").press("Enter");

  await expect(row).toContainText("Randen");
  await expect(row).toContainText("Überschrieben am:");
});

test("E2E-ADMIN-015 cancels inline crop override with Escape and blur without changes", async ({
  page,
  request,
}) => {
  const { orderNumber, token } = await createProbeOrder(request, {
    orderPrefix: "E2E-ADMIN-015",
  });

  const submitStatus = await submitProbe(request, token);
  expect(submitStatus).toBe(201);

  await page.goto("/admin?onboarding=off");
  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);

  await row.getByRole("button", { name: "Kultur bearbeiten" }).click();
  const input = row.getByPlaceholder("Kultur anpassen");
  await expect(input).toBeFocused();
  await expect(row).toContainText("Enter speichert, Esc verwirft.");

  await input.fill("Randen");
  await input.press("Escape");
  await expect(input).toHaveCount(0);
  await expect(row).toContainText("Kartoffeln");
  await expect(row).not.toContainText("Randen");

  await row.getByRole("button", { name: "Kultur bearbeiten" }).click();
  const unchangedInput = row.getByPlaceholder("Kultur anpassen");
  await unchangedInput.blur();
  await expect(unchangedInput).toHaveCount(0);
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
  await page.setInputFiles("input[type='file']", buildTinyPng4x4ImagePayload());

  const submitButton = page.getByRole("button", { name: "Absenden" });
  await expect(submitButton).toBeDisabled();

  await chooseSelectOption(page, "Pflanzenvitalität", "normal");
  await expect(submitButton).toBeDisabled();

  await chooseSelectOption(page, "Bodenfeuchte", "normal");
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

  await page.goto("/admin?onboarding=off");
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
  await page.goto("/admin?onboarding=off");

  const topScrollbar = page.locator("#admin-table-scroll-top");
  const bottomScrollbar = page.locator("#admin-table-scroll-bottom");
  const scrollViewport = page.locator("#admin-table-scroll-viewport");
  await expect(topScrollbar).toBeVisible();
  await expect(bottomScrollbar).toBeVisible();

  await scrollViewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect
    .poll(() => scrollViewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  const row = page.locator("tbody tr", { hasText: orderNumber });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("button", { name: "Anzeigen" })).toBeVisible();
  const imageHeader = page.getByRole("columnheader", { name: "Bild" });
  const imageCell = row.locator("td").last();
  await expect(imageHeader).toHaveCSS("border-bottom-width", "1px");
  const headerBox = await imageHeader.boundingBox();
  const cellBox = await imageCell.boundingBox();
  expect(headerBox?.width).toBeTruthy();
  expect(cellBox?.width).toBeTruthy();
  expect(Math.abs((headerBox?.width ?? 0) - (cellBox?.width ?? 0))).toBeLessThanOrEqual(1);

  await scrollViewport.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await expect.poll(() => scrollViewport.evaluate((element) => element.scrollLeft)).toBe(0);
});
