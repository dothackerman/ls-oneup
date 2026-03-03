import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const probes = sqliteTable(
  "probes",
  {
    id: text("id").primaryKey(),
    customerName: text("customer_name").notNull(),
    orderNumber: text("order_number").notNull(),
    probeNumber: integer("probe_number").notNull(),

    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
    expireBy: text("expire_by").notNull(),
    submittedAt: text("submitted_at"),

    cropName: text("crop_name"),
    cropOverriddenAt: text("crop_overridden_at"),

    plantVitality: text("plant_vitality"),
    soilMoisture: text("soil_moisture"),
    gpsLat: real("gps_lat"),
    gpsLon: real("gps_lon"),
    gpsCapturedAt: text("gps_captured_at"),

    imageKey: text("image_key"),
    imageMime: text("image_mime"),
    imageBytes: integer("image_bytes"),
    imageUploadedAt: text("image_uploaded_at"),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("probes_token_hash_unique").on(table.tokenHash),
    orderProbeUnique: uniqueIndex("probes_order_probe_unique").on(
      table.customerName,
      table.orderNumber,
      table.probeNumber,
    ),
    createdAtIdx: index("idx_probes_created_at").on(table.createdAt),
    expireByIdx: index("idx_probes_expire_by").on(table.expireBy),
    submittedAtIdx: index("idx_probes_submitted_at").on(table.submittedAt),
    lookupOrderIdx: index("idx_probes_lookup_order").on(table.customerName, table.orderNumber),
  }),
);
