import fs from "node:fs";
import path from "node:path";

import { CliError } from "./errors.mjs";

const REQUIRED_KEYS = ["LS_ONEUP_BASE_URL"];

function parseLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) {
    return null;
  }

  const idx = line.indexOf("=");
  if (idx <= 0) {
    return null;
  }

  const key = line.slice(0, idx).trim();
  let value = line.slice(idx + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new CliError(
      "ENV_FILE_MISSING",
      `Missing env file at ${envPath}. Copy .env.example to .env first.`,
      { env_path: envPath },
    );
  }

  const content = fs.readFileSync(envPath, "utf8");
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const kv = parseLine(rawLine);
    if (!kv) {
      continue;
    }
    parsed[kv.key] = kv.value;
  }
  return parsed;
}

export function resolveConfig({ cliDir, processEnv }) {
  const envPath = path.join(cliDir, ".env");
  const fromFile = loadEnvFile(envPath);
  const merged = { ...fromFile, ...processEnv };
  const missing = REQUIRED_KEYS.filter((key) => !merged[key]);
  if (missing.length > 0) {
    throw new CliError(
      "ENV_INVALID",
      `Missing required env keys: ${missing.join(", ")}.`,
      { env_path: envPath, missing_keys: missing },
    );
  }

  return {
    envPath,
    baseUrl: merged.LS_ONEUP_BASE_URL,
  };
}
