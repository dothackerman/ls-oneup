#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const INVENTORY_PATH = path.join(ROOT, "docs/security/crypto-inventory.json");
const OUTPUT_PATH = path.join(ROOT, "docs/security/crypto-discovery.json");
const SCAN_DIRS = ["src", "worker", "tests", "scripts", "migrations"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".sql"]);

const MARKERS = [
  {
    id: "webcrypto-get-random-values",
    primitive: "Web Crypto CSPRNG",
    regex: /crypto\.getRandomValues\(/g,
  },
  {
    id: "webcrypto-subtle-import-key",
    primitive: "Web Crypto importKey",
    regex: /crypto\.subtle\.importKey\(/g,
  },
  {
    id: "webcrypto-subtle-sign",
    primitive: "Web Crypto sign",
    regex: /crypto\.subtle\.sign\(/g,
  },
  {
    id: "webcrypto-subtle-encrypt",
    primitive: "Web Crypto encrypt",
    regex: /crypto\.subtle\.encrypt\(/g,
  },
  {
    id: "webcrypto-subtle-decrypt",
    primitive: "Web Crypto decrypt",
    regex: /crypto\.subtle\.decrypt\(/g,
  },
];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(fullPath)));
      continue;
    }

    if (SCAN_EXT.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

function normalizeExpectedReferences(inventory) {
  const expected = [];
  for (const item of inventory.inventory ?? []) {
    for (const discovery of item.discovery ?? []) {
      expected.push({
        inventory_id: item.id,
        marker_id: discovery.marker_id,
        path: discovery.path,
      });
    }
  }
  return expected;
}

function hasReference(list, markerId, filePath) {
  return list.some((entry) => entry.marker_id === markerId && entry.path === filePath);
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(INVENTORY_PATH, "utf8"));
  const expected = normalizeExpectedReferences(inventory);

  const files = [];
  for (const dir of SCAN_DIRS) {
    files.push(...(await walk(path.join(ROOT, dir))));
  }

  const observations = [];
  for (const file of files) {
    const relativePath = path.relative(ROOT, file);
    const content = await fs.readFile(file, "utf8");
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const marker of MARKERS) {
        marker.regex.lastIndex = 0;
        if (!marker.regex.test(line)) {
          continue;
        }
        observations.push({
          marker_id: marker.id,
          primitive: marker.primitive,
          path: relativePath,
          line: index + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  const unmatched = observations.filter(
    (observation) => !hasReference(expected, observation.marker_id, observation.path),
  );

  const missing = expected.filter(
    (reference) => !hasReference(observations, reference.marker_id, reference.path),
  );

  const output = {
    generated_at: new Date().toISOString(),
    inventory_path: path.relative(ROOT, INVENTORY_PATH),
    scanned_paths: SCAN_DIRS,
    marker_count: MARKERS.length,
    inventory_entries: (inventory.inventory ?? []).length,
    observations,
    unmatched_observations: unmatched,
    missing_inventory_references: missing,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

  console.log("");
  console.log("--- CRYPTO INVENTORY SUMMARY ---");
  console.log(`inventory_entries: ${output.inventory_entries}`);
  console.log(`observations:      ${observations.length}`);
  console.log(`unmatched:         ${unmatched.length}`);
  console.log(`missing:           ${missing.length}`);
  console.log(`report:            ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log("--- END SUMMARY ---");

  if (unmatched.length > 0 || missing.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
