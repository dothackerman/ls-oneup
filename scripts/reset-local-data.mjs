import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`Command failed (${command} ${args.join(" ")}) with exit code ${code}`));
    });
  });
}

async function main() {
  const wranglerStatePath = path.resolve(".wrangler", "state", "v3");
  await rm(wranglerStatePath, { recursive: true, force: true });

  await run("npm", ["run", "db:migrate:local"]);

  const query = await run(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "ls-oneup-db",
      "--local",
      "--config",
      "wrangler.jsonc",
      "--command",
      "SELECT COUNT(*) AS probe_count FROM probes;",
    ],
    {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: ".wrangler-config",
      },
    },
  );

  const match = query.stdout.match(/"probe_count"\s*:\s*(\d+)/);
  if (!match) {
    throw new Error("Could not parse probe_count from local D1 output.");
  }

  const count = Number(match[1]);
  if (count !== 0) {
    throw new Error(`Local D1 reset failed. Expected probe_count=0, got ${count}.`);
  }

  console.log(`Local reset successful. probe_count=${count}.`);
}

await main();
