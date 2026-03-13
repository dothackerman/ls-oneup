#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const INVENTORY_PATH = path.join(ROOT, "docs/security/crypto-inventory.json");
const DISCOVERY_PATH = path.join(ROOT, "docs/security/crypto-discovery.json");

const REQUIRED_TOP_FIELDS = ["reviewed_at", "owner", "policy_ref"];
const REQUIRED_ENTRY_FIELDS = [
  "id",
  "purpose",
  "scope",
  "algorithm",
  "key_source",
  "rotation_policy",
  "agility_plan",
];

function fail(message) {
  console.error(`Crypto gate failed: ${message}`);
  process.exit(1);
}

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(INVENTORY_PATH, "utf8"));
  const discovery = JSON.parse(await fs.readFile(DISCOVERY_PATH, "utf8"));

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!String(inventory?.[field] ?? "").trim()) {
      fail(`missing top-level inventory field '${field}'`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(inventory.reviewed_at ?? ""))) {
    fail("top-level reviewed_at must be YYYY-MM-DD");
  }

  if (!(await exists(inventory.policy_ref))) {
    fail(`policy_ref does not exist: ${inventory.policy_ref}`);
  }

  if (!Array.isArray(inventory.inventory) || inventory.inventory.length === 0) {
    fail("inventory is empty");
  }

  if (!Array.isArray(inventory.migration_plan) || inventory.migration_plan.length === 0) {
    fail("migration_plan must contain at least one entry");
  }

  let invalidEntries = 0;
  for (const entry of inventory.inventory) {
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (!String(entry?.[field] ?? "").trim()) {
        invalidEntries += 1;
        console.error(`Invalid inventory entry '${entry?.id ?? "unknown"}': missing ${field}`);
      }
    }

    if (!Array.isArray(entry?.code_references) || entry.code_references.length === 0) {
      invalidEntries += 1;
      console.error(`Invalid inventory entry '${entry?.id ?? "unknown"}': missing code_references`);
    }

    if (!Array.isArray(entry?.discovery) || entry.discovery.length === 0) {
      invalidEntries += 1;
      console.error(`Invalid inventory entry '${entry?.id ?? "unknown"}': missing discovery mapping`);
    }

    for (const relPath of entry?.code_references ?? []) {
      if (!(await exists(relPath))) {
        invalidEntries += 1;
        console.error(`Invalid inventory entry '${entry?.id ?? "unknown"}': missing path ${relPath}`);
      }
    }

    for (const mapped of entry?.discovery ?? []) {
      if (!String(mapped?.marker_id ?? "").trim() || !String(mapped?.path ?? "").trim()) {
        invalidEntries += 1;
        console.error(`Invalid inventory entry '${entry?.id ?? "unknown"}': malformed discovery mapping`);
        continue;
      }

      if (!(await exists(mapped.path))) {
        invalidEntries += 1;
        console.error(
          `Invalid inventory entry '${entry?.id ?? "unknown"}': missing discovery path ${mapped.path}`,
        );
      }
    }
  }

  if (invalidEntries > 0) {
    fail(`${invalidEntries} inventory validation errors`);
  }

  const observations = Array.isArray(discovery?.observations) ? discovery.observations : [];
  const unmatched = Array.isArray(discovery?.unmatched_observations)
    ? discovery.unmatched_observations
    : [];
  const missing = Array.isArray(discovery?.missing_inventory_references)
    ? discovery.missing_inventory_references
    : [];

  if (unmatched.length > 0) {
    console.error("Unmatched crypto observations:");
    for (const item of unmatched) {
      console.error(`- ${item.path}:${item.line} [${item.marker_id}] ${item.snippet}`);
    }
    fail(`${unmatched.length} observations are not covered by the inventory`);
  }

  if (missing.length > 0) {
    console.error("Missing crypto inventory references:");
    for (const item of missing) {
      console.error(`- ${item.path} [${item.marker_id}] expected by ${item.inventory_id}`);
    }
    fail(`${missing.length} inventory references were not rediscovered`);
  }

  console.log("");
  console.log("--- CRYPTO GATE SUMMARY ---");
  console.log("gate:                PASSED");
  console.log(`inventory_items:     ${inventory.inventory.length}`);
  console.log(`observations:        ${observations.length}`);
  console.log(`unmatched:           ${unmatched.length}`);
  console.log(`missing:             ${missing.length}`);
  console.log("--- END SUMMARY ---");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
