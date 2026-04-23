import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCloudflaredToken } from "../ls-oneup-cli/src/cloudflared.mjs";
import { parseArgs, run } from "../ls-oneup-cli/src/cli.mjs";
import { CliError } from "../ls-oneup-cli/src/errors.mjs";

function createCliDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ls-oneup-cli-test-"));
  fs.writeFileSync(path.join(dir, ".env"), "LS_ONEUP_BASE_URL=https://example.test\n", "utf8");
  return dir;
}

function createSpawnStub({
  stdout = "",
  stderr = "",
  exitCode = 0,
  emitError = null,
}: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  emitError?: Error | null;
}) {
  return () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: (_signal: string) => void;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => undefined;

    queueMicrotask(() => {
      if (emitError) {
        child.emit("error", emitError);
        return;
      }
      if (stdout) {
        child.stdout.emit("data", Buffer.from(stdout));
      }
      if (stderr) {
        child.stderr.emit("data", Buffer.from(stderr));
      }
      child.emit("close", exitCode);
    });

    return child;
  };
}

describe("ls-oneup-cli argument parsing", () => {
  it("parses probes list filters", () => {
    const parsed = parseArgs([
      "probes",
      "list",
      "--customer-name",
      "ACME",
      "--order-number",
      "ORD-1",
      "--status",
      "offen",
    ]);
    expect(parsed).toEqual({
      command: "probes.list",
      filters: {
        customer_name: "ACME",
        order_number: "ORD-1",
        status: "offen",
      },
    });
  });

  it("allows only the two read commands", () => {
    expect(() => parseArgs(["probes", "delete", "123"])).toThrow();
    expect(() => parseArgs(["raw", "get", "/api/admin/probes"])).toThrow();
  });
});

describe("ls-oneup-cli run()", () => {
  it("routes list calls to allowlisted endpoint and returns stdout JSON payload", async () => {
    const cliDir = createCliDir();
    const calls: URL[] = [];
    const result = await run(
      ["probes", "list", "--customer-name", "ACME", "--order-number", "ORD-1"],
      {
        cliDir,
        getToken: async () => "jwt-token",
        fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
          calls.push(new URL(String(input)));
          expect(init?.method).toBe("GET");
          expect(init?.headers).toMatchObject({
            "Cf-Access-Jwt-Assertion": "jwt-token",
          });
          return new Response(
            JSON.stringify({
              items: [{ probe_id: "p1" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.payload.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].pathname).toBe("/api/admin/probes");
    expect(calls[0].searchParams.get("customer_name")).toBe("ACME");
    expect(calls[0].searchParams.get("order_number")).toBe("ORD-1");
  });

  it("writes image bytes to disk and returns metadata", async () => {
    const cliDir = createCliDir();
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ls-oneup-image-"));
    const outputPath = path.join(outputDir, "probe.jpg");
    const bytes = Uint8Array.from([255, 216, 255, 217]);
    const result = await run(["probes", "image", "probe-123", "--out", outputPath], {
      cliDir,
      getToken: async () => "jwt-token",
      fetchImpl: async () =>
        new Response(bytes, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.payload.ok).toBe(true);
    expect(result.payload.data.output_path).toBe(path.resolve(outputPath));
    expect(result.payload.data.bytes).toBe(4);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("returns auth errors as stdout-safe JSON payloads", async () => {
    const cliDir = createCliDir();
    const result = await run(["probes", "list"], {
      cliDir,
      getToken: async () => {
        throw new CliError("AUTH_REQUIRED", "Please login first.");
      },
      fetchImpl: async () => {
        throw new Error("should not run");
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.payload.ok).toBe(false);
    expect(result.payload.error_code).toBe("AUTH_REQUIRED");
  });
});

describe("cloudflared token helper", () => {
  it("returns trimmed token output", async () => {
    const token = await getCloudflaredToken({
      baseUrl: "https://example.test",
      spawnImpl: createSpawnStub({ stdout: "abc123\n", exitCode: 0 }) as never,
    });
    expect(token).toBe("abc123");
  });

  it("maps auth failures to AUTH_REQUIRED", async () => {
    await expect(
      getCloudflaredToken({
        baseUrl: "https://example.test",
        spawnImpl: createSpawnStub({
          stderr: "Please login first.",
          exitCode: 1,
        }) as never,
      }),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("maps missing cloudflared binary to AUTH_TOOL_MISSING", async () => {
    await expect(
      getCloudflaredToken({
        baseUrl: "https://example.test",
        spawnImpl: createSpawnStub({
          emitError: new Error("spawn cloudflared ENOENT"),
        }) as never,
      }),
    ).rejects.toMatchObject({ code: "AUTH_TOOL_MISSING" });
  });
});
