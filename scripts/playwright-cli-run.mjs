import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const browsersDir = path.join(cwd, ".playwright-browsers");
const baseConfigPath = path.join(cwd, ".playwright", "cli.config.json");
const runtimeConfigPath = path.join(cwd, ".playwright", "cli.runtime.json");
const daemonDir = path.join(cwd, ".playwright", "daemon");

function resolveChromiumExecutable() {
  if (!fs.existsSync(browsersDir)) {
    throw new Error(
      "Missing .playwright-browsers. Run `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium` first.",
    );
  }

  const chromiumDir = fs
    .readdirSync(browsersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0];

  if (!chromiumDir) {
    throw new Error(
      "No Chromium install found under .playwright-browsers. Run `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium` first.",
    );
  }

  const executablePath = path.join(browsersDir, chromiumDir.name, "chrome-linux64", "chrome");
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Chromium executable not found at ${executablePath}.`);
  }

  return executablePath;
}

function writeRuntimeConfig() {
  if (!fs.existsSync(baseConfigPath)) {
    throw new Error(`Missing base Playwright CLI config at ${baseConfigPath}.`);
  }

  const config = JSON.parse(fs.readFileSync(baseConfigPath, "utf8"));
  config.browser ??= {};
  config.browser.browserName = "chromium";
  config.browser.launchOptions ??= {};
  config.browser.launchOptions.channel = "chromium";
  config.browser.launchOptions.executablePath = resolveChromiumExecutable();
  config.browser.launchOptions.chromiumSandbox = false;

  fs.mkdirSync(path.dirname(runtimeConfigPath), { recursive: true });
  fs.writeFileSync(runtimeConfigPath, JSON.stringify(config, null, 2));
  return runtimeConfigPath;
}

function withConfigArg(args, configPath) {
  if (args.some((arg) => arg === "--config" || arg.startsWith("--config="))) {
    return args;
  }
  return [...args, `--config=${configPath}`];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node scripts/playwright-cli-run.mjs <playwright-cli args...>");
    process.exit(1);
  }

  const configPath = writeRuntimeConfig();
  fs.mkdirSync(daemonDir, { recursive: true });

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["playwright-cli", ...withConfigArg(args, configPath)],
    {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: browsersDir,
        PLAYWRIGHT_DAEMON_SESSION_DIR: daemonDir,
      },
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
