export const VITALITY_VALUES = [
  "normal",
  "schwach_langsam",
  "krankheit_oder_anderes_problem",
] as const;

export const SOIL_MOISTURE_VALUES = [
  "sehr_trocken",
  "trocken",
  "normal",
  "nass",
  "sehr_nass",
] as const;

export const STATUS_VALUES = ["offen", "eingereicht", "abgelaufen"] as const;

export type Vitality = (typeof VITALITY_VALUES)[number];
export type SoilMoisture = (typeof SOIL_MOISTURE_VALUES)[number];
export type ProbeStatus = (typeof STATUS_VALUES)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png"] as const;

export function deriveStatus(
  submittedAt: string | null,
  expireBy: string,
  nowIso: string,
): ProbeStatus {
  if (submittedAt) {
    return "eingereicht";
  }
  if (expireBy <= nowIso) {
    return "abgelaufen";
  }
  return "offen";
}
