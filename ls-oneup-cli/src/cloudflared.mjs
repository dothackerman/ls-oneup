import { spawn } from "node:child_process";

import { CliError } from "./errors.mjs";

const AUTH_FAILURE_PATTERNS = [
  /login/i,
  /not.*authenticated/i,
  /token.*expired/i,
  /please.*authenticate/i,
];

function detectAuthFailure(message) {
  return AUTH_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function getCloudflaredToken({ baseUrl, spawnImpl = spawn, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl("cloudflared", ["access", "token", "--app", baseUrl], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new CliError(
          "AUTH_TIMEOUT",
          "Timed out while waiting for cloudflared token. Re-run cloudflared login.",
          { timeout_ms: timeoutMs },
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new CliError("AUTH_TOOL_MISSING", "cloudflared is not available in PATH.", {
          cause: String(error),
        }),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const message = stderr.trim() || "cloudflared token command failed.";
        const errorCode = detectAuthFailure(message) ? "AUTH_REQUIRED" : "AUTH_FAILED";
        reject(new CliError(errorCode, message, { exit_code: code }));
        return;
      }

      const token = stdout.trim();
      if (!token) {
        reject(
          new CliError("AUTH_FAILED", "cloudflared returned an empty token.", {
            exit_code: code,
          }),
        );
        return;
      }
      resolve(token);
    });
  });
}
