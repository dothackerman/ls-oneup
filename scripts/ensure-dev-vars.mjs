#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DEV_VARS_PATH = path.join(ROOT, ".dev.vars");

async function main() {
  const tokenKeys = process.env.TOKEN_HMAC_KEYS_JSON;
  if (!tokenKeys) {
    throw new Error("TOKEN_HMAC_KEYS_JSON is required when creating .dev.vars");
  }

  const submissionKeys = process.env.SUBMISSION_DATA_KEYS_JSON;
  if (!submissionKeys) {
    throw new Error("SUBMISSION_DATA_KEYS_JSON is required when creating .dev.vars");
  }

  const expectedLines = [
    `TOKEN_HMAC_KEYS_JSON='${tokenKeys.replace(/'/g, "'\\''")}'`,
    `SUBMISSION_DATA_KEYS_JSON='${submissionKeys.replace(/'/g, "'\\''")}'`,
  ];

  try {
    const current = await fs.readFile(DEV_VARS_PATH, "utf8");
    const nextLines = expectedLines.filter(
      (line) => !current.includes(line.split("=")[0] ?? ""),
    );

    if (nextLines.length === 0) {
      console.log(".dev.vars already present");
      return;
    }

    const next = `${current.trimEnd()}\n${nextLines.join("\n")}\n`;
    await fs.writeFile(DEV_VARS_PATH, next, { mode: 0o600 });
    console.log("Updated .dev.vars with missing secret inputs");
    return;
  } catch {
    // Continue and create the file.
  }

  await fs.writeFile(DEV_VARS_PATH, `${expectedLines.join("\n")}\n`, { mode: 0o600 });
  console.log("Created .dev.vars from provided secret inputs");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
