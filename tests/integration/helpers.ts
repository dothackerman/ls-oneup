import { SELF } from "cloudflare:test";

export async function createProbeOrder(overrides?: {
  customer_name?: string;
  order_number?: string;
  probe_count?: number;
}): Promise<{ tokenUrl: string; probeId: string }> {
  const response = await SELF.fetch("https://example.test/api/admin/probes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      customer_name: overrides?.customer_name ?? "Kunde A",
      order_number: overrides?.order_number ?? `ORD-${crypto.randomUUID()}`,
      probe_count: overrides?.probe_count ?? 1,
    }),
  });

  const payload = (await response.json()) as {
    items: Array<{ token_url: string; probe_id: string }>;
  };

  if (!response.ok || !payload.items || payload.items.length === 0) {
    throw new Error(`Probe creation failed with status ${response.status}`);
  }

  return {
    tokenUrl: payload.items[0].token_url,
    probeId: payload.items[0].probe_id,
  };
}

export function tokenFromUrl(tokenUrl: string): string {
  const url = new URL(tokenUrl);
  return url.pathname.split("/").pop() || "";
}

export function buildValidForm(): FormData {
  const form = new FormData();
  form.set("crop_name", "Kartoffeln");
  form.set("vitality", "normal");
  form.set("soil_moisture", "normal");
  form.set("gps_lat", "47.3769");
  form.set("gps_lon", "8.5417");
  form.set("gps_captured_at", new Date().toISOString());

  const bytes = Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);
  form.append("image", new File([bytes], "probe.jpg", { type: "image/jpeg" }));

  return form;
}
