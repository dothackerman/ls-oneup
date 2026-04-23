import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { fetchProbeImage, listProbes } from "./api.mjs";
import { getCloudflaredToken } from "./cloudflared.mjs";
import { resolveConfig } from "./env.mjs";
import { CliError, toErrorPayload } from "./errors.mjs";

const HELP_TEXT = `Usage:
  ls-oneup probes list [--customer-name <value>] [--order-number <value>] [--status <value>]
  ls-oneup probes image <probe-id> [--out <path>]
`;

function readFlagValue(args, index, flagName) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError("VALIDATION_ERROR", `Missing value for ${flagName}.`);
  }
  return value;
}

export function parseArgs(argv) {
  if (argv.length < 2) {
    throw new CliError("USAGE_ERROR", HELP_TEXT);
  }

  const [domain, action, ...rest] = argv;
  if (domain !== "probes") {
    throw new CliError("USAGE_ERROR", HELP_TEXT);
  }

  if (action === "list") {
    const filters = {
      customer_name: null,
      order_number: null,
      status: null,
    };

    for (let i = 0; i < rest.length; i += 1) {
      const arg = rest[i];
      if (arg === "--customer-name") {
        filters.customer_name = readFlagValue(rest, i, arg);
        i += 1;
        continue;
      }
      if (arg === "--order-number") {
        filters.order_number = readFlagValue(rest, i, arg);
        i += 1;
        continue;
      }
      if (arg === "--status") {
        filters.status = readFlagValue(rest, i, arg);
        i += 1;
        continue;
      }
      throw new CliError("USAGE_ERROR", HELP_TEXT);
    }
    return { command: "probes.list", filters };
  }

  if (action === "image") {
    if (rest.length === 0) {
      throw new CliError("USAGE_ERROR", HELP_TEXT);
    }
    const probeId = rest[0];
    let out = null;
    for (let i = 1; i < rest.length; i += 1) {
      const arg = rest[i];
      if (arg === "--out") {
        out = readFlagValue(rest, i, arg);
        i += 1;
        continue;
      }
      throw new CliError("USAGE_ERROR", HELP_TEXT);
    }
    return { command: "probes.image", probeId, out };
  }

  throw new CliError("USAGE_ERROR", HELP_TEXT);
}

export async function run(argv, deps = {}) {
  try {
    const parsed = parseArgs(argv);
    const cliDir =
      deps.cliDir ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const config = resolveConfig({
      cliDir,
      processEnv: deps.processEnv ?? process.env,
    });
    const getToken = deps.getToken ?? ((baseUrl) => getCloudflaredToken({ baseUrl }));
    const fetchImpl = deps.fetchImpl ?? fetch;

    if (parsed.command === "probes.list") {
      const payload = await listProbes({
        baseUrl: config.baseUrl,
        filters: parsed.filters,
        getToken,
        fetchImpl,
      });
      return { exitCode: 0, payload: { ok: true, data: payload } };
    }

    if (parsed.command === "probes.image") {
      const payload = await fetchProbeImage({
        baseUrl: config.baseUrl,
        probeId: parsed.probeId,
        outputPath: parsed.out,
        getToken,
        fetchImpl,
      });
      return { exitCode: 0, payload: { ok: true, data: payload } };
    }

    throw new CliError("USAGE_ERROR", HELP_TEXT);
  } catch (error) {
    return { exitCode: 1, payload: toErrorPayload(error) };
  }
}
