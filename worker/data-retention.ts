import type { AllowedImageMime } from "../src/shared/domain";
import {
  assertSubmissionImageStoragePolicy,
  SubmissionImagePolicyError,
} from "./submission-security";

export const SUBMISSION_RETENTION_DAYS = 365;
export const SUBMISSION_ARTIFACT_RETENTION_DAYS = SUBMISSION_RETENTION_DAYS;
export const SUBMISSION_ARTIFACT_RETENTION_CLASS = "submitted_probe_artifact";
export const IMAGE_METADATA_REJECTED_CODE = "IMAGE_METADATA_NOT_ALLOWED";
export const IMAGE_METADATA_REJECTED_MESSAGE =
  "Bildmetadaten muessen vor dem Upload entfernt werden.";

export type StoredImageRetentionPolicy = {
  deleteAfter: string;
  customMetadata: Record<string, string>;
};

function parseIso(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Retention timestamps must be valid ISO-8601 strings.");
  }
  return parsed;
}

function addDays(iso: string, days: number): string {
  const next = parseIso(iso);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export function submissionRetentionDeadline(submittedAtIso: string): string {
  return addDays(submittedAtIso, SUBMISSION_RETENTION_DAYS);
}

export function submissionRetentionCutoff(nowIso: string): string {
  return addDays(nowIso, -SUBMISSION_RETENTION_DAYS);
}

export function isPastSubmissionRetention(submittedAtIso: string, nowIso: string): boolean {
  return submissionRetentionDeadline(submittedAtIso) <= parseIso(nowIso).toISOString();
}

export function hasRejectedImageMetadata(bytes: Uint8Array, mime: AllowedImageMime): boolean {
  try {
    assertSubmissionImageStoragePolicy(bytes, mime);
    return false;
  } catch (error) {
    if (error instanceof SubmissionImagePolicyError) {
      return true;
    }
    throw error;
  }
}

export function buildSubmissionArtifactRetention(
  submittedAtIso: string,
): StoredImageRetentionPolicy {
  const deleteAfter = submissionRetentionDeadline(submittedAtIso);

  return {
    deleteAfter,
    customMetadata: {
      retention_class: SUBMISSION_ARTIFACT_RETENTION_CLASS,
      delete_after: deleteAfter,
      image_metadata_policy: "reject_embedded_metadata",
    },
  };
}
