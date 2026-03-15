import { isAllowedImageMime, MAX_IMAGE_BYTES, type AllowedImageMime } from "../src/shared/domain";
import { jsonError } from "../src/shared/errors";
import {
  farmerSubmitFieldsSchema,
  farmerSubmitValidationMessage,
  type FarmerSubmitFields,
} from "../src/shared/validation";
import type { ProbeTokenState } from "./repository";

const TOKEN_USED_MESSAGE = "Link wurde bereits verwendet.";
const TOKEN_EXPIRED_MESSAGE = "Link ist abgelaufen.";

export type SubmitRequestPayload = {
  image: File & { type: AllowedImageMime };
  fields: FarmerSubmitFields;
};

export function ensureSubmitTokenState(
  tokenState: Pick<ProbeTokenState, "submitted_at" | "expire_by">,
  nowIso: string,
): Response | null {
  if (tokenState.submitted_at) {
    return jsonError(409, "TOKEN_ALREADY_USED", TOKEN_USED_MESSAGE);
  }

  if (tokenState.expire_by <= nowIso) {
    return jsonError(410, "TOKEN_EXPIRED", TOKEN_EXPIRED_MESSAGE);
  }

  return null;
}

function extractSingleImage(formData: FormData): Response | (File & { type: AllowedImageMime }) {
  const imageEntries = formData
    .getAll("image")
    .filter((value): value is File => value instanceof File);
  if (imageEntries.length !== 1) {
    return jsonError(400, "IMAGE_REQUIRED", "Genau ein Bild ist erforderlich.");
  }

  const image = imageEntries[0];

  if (!isAllowedImageMime(image.type)) {
    return jsonError(415, "INVALID_IMAGE_MIME", "Nur JPEG oder PNG sind erlaubt.");
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonError(413, "IMAGE_TOO_LARGE", "Bild ist grösser als 2 MB.");
  }

  return image as File & { type: AllowedImageMime };
}

export async function parseSubmitRequest(
  request: Request,
): Promise<Response | SubmitRequestPayload> {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError(400, "VALIDATION_ERROR", "Ungültige Formular-Daten.");
  }

  const image = extractSingleImage(formData);
  if (image instanceof Response) {
    return image;
  }

  const parsed = farmerSubmitFieldsSchema.safeParse({
    crop_name: formData.get("crop_name"),
    vitality: formData.get("vitality"),
    soil_moisture: formData.get("soil_moisture"),
    gps_lat: formData.get("gps_lat"),
    gps_lon: formData.get("gps_lon"),
    gps_captured_at: formData.get("gps_captured_at"),
  });

  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", farmerSubmitValidationMessage(parsed.error));
  }

  return {
    image,
    fields: parsed.data,
  };
}
