export type ApiError = {
  error_code: string;
  message: string;
};

export function jsonError(status: number, error_code: string, message: string): Response {
  return Response.json({ error_code, message } satisfies ApiError, { status });
}
