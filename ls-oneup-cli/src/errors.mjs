export class CliError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.details = details;
  }
}

export function toErrorPayload(error) {
  if (error instanceof CliError) {
    return {
      ok: false,
      error_code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    ok: false,
    error_code: "INTERNAL_ERROR",
    message: "Unexpected CLI failure.",
    details: { cause: String(error) },
  };
}
