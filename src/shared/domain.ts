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
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png"] as const;
const JPEG_SIGNATURE = Uint8Array.from([255, 216, 255]);
const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function isAllowedImageMime(value: string): value is AllowedImageMime {
  return ALLOWED_IMAGE_MIME.includes(value as AllowedImageMime);
}

function hasSignature(bytes: Uint8Array, signature: Uint8Array): boolean {
  if (bytes.byteLength < signature.byteLength) {
    return false;
  }

  for (let index = 0; index < signature.byteLength; index += 1) {
    if (bytes[index] !== signature[index]) {
      return false;
    }
  }

  return true;
}

export function hasAllowedImageSignature(bytes: Uint8Array, mime: AllowedImageMime): boolean {
  if (mime === "image/jpeg") {
    return hasSignature(bytes, JPEG_SIGNATURE);
  }

  return hasSignature(bytes, PNG_SIGNATURE);
}

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
