import { z } from "zod";
import { SOIL_MOISTURE_VALUES, VITALITY_VALUES } from "./domain";

export const createProbesSchema = z.object({
  customer_name: z.string().trim().min(1),
  order_number: z.string().trim().min(1),
  probe_count: z.number().int().min(1).max(500),
});

export const listProbesQuerySchema = z.object({
  customer_name: z.string().trim().optional(),
  order_number: z.string().trim().optional(),
  status: z.enum(["offen", "eingereicht", "abgelaufen"]).optional(),
});

export const cropOverrideSchema = z.object({
  crop_name: z.string().trim().min(1),
});

export const farmerSubmitFieldsSchema = z.object({
  crop_name: z.string().trim().min(1),
  vitality: z.enum(VITALITY_VALUES),
  soil_moisture: z.enum(SOIL_MOISTURE_VALUES),
  gps_lat: z.coerce.number().gte(-90).lte(90),
  gps_lon: z.coerce.number().gte(-180).lte(180),
  gps_captured_at: z.string().datetime({ offset: true }),
});
