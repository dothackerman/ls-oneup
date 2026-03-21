#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const INVENTORY_PATH = path.join(ROOT, "docs/security/crypto-inventory.json");
const DISCOVERY_PATH = path.join(ROOT, "docs/security/crypto-discovery.json");

const INVENTORY_SCHEMA_VERSION = 2;
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isEphemeralMigrationReference(relPath) {
  return /^migrations\/.+\.sql$/u.test(relPath);
}

function pushEntryError(errors, entryId, message) {
  errors.push(`Invalid inventory entry '${entryId}': ${message}`);
}

export async function validateInventoryDocument(inventory, options = {}) {
  const pathExists = options.pathExists ?? exists;
  const errors = [];

  if (inventory?.schema_version !== INVENTORY_SCHEMA_VERSION) {
    errors.push(`top-level schema_version must be ${INVENTORY_SCHEMA_VERSION}`);
  }

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!String(inventory?.[field] ?? "").trim()) {
      errors.push(`missing top-level inventory field '${field}'`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(inventory?.reviewed_at ?? ""))) {
    errors.push("top-level reviewed_at must be YYYY-MM-DD");
  }

  if (isNonEmptyString(inventory?.policy_ref) && !(await pathExists(inventory.policy_ref))) {
    errors.push(`policy_ref does not exist: ${inventory.policy_ref}`);
  }

  if (!Array.isArray(inventory.inventory) || inventory.inventory.length === 0) {
    errors.push("inventory is empty");
  }

  if (!Array.isArray(inventory.migration_plan) || inventory.migration_plan.length === 0) {
    errors.push("migration_plan must contain at least one entry");
  }

  for (const entry of inventory.inventory ?? []) {
    const entryId = entry?.id ?? "unknown";

    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (!String(entry?.[field] ?? "").trim()) {
        pushEntryError(errors, entryId, `missing ${field}`);
      }
    }

    if ("code_references" in (entry ?? {})) {
      pushEntryError(
        errors,
        entryId,
        "legacy code_references is not allowed in schema v2; use current_code_references and provenance_code_references",
      );
    }

    if (
      !Array.isArray(entry?.current_code_references) ||
      entry.current_code_references.length === 0
    ) {
      pushEntryError(errors, entryId, "missing current_code_references");
    }

    if (!Array.isArray(entry?.provenance_code_references)) {
      pushEntryError(errors, entryId, "missing provenance_code_references");
    }

    if (!Array.isArray(entry?.discovery) || entry.discovery.length === 0) {
      pushEntryError(errors, entryId, "missing discovery mapping");
    }

    for (const relPath of entry?.current_code_references ?? []) {
      if (!isNonEmptyString(relPath)) {
        pushEntryError(errors, entryId, "malformed current_code_references entry");
        continue;
      }

      if (isEphemeralMigrationReference(relPath)) {
        pushEntryError(
          errors,
          entryId,
          `ephemeral migration references are not allowed in current_code_references: ${relPath}`,
        );
        continue;
      }

      if (!(await pathExists(relPath))) {
        pushEntryError(errors, entryId, `missing path ${relPath}`);
      }
    }

    for (const relPath of entry?.provenance_code_references ?? []) {
      if (!isNonEmptyString(relPath)) {
        pushEntryError(errors, entryId, "malformed provenance_code_references entry");
      }
    }

    for (const mapped of entry?.discovery ?? []) {
      if (!String(mapped?.marker_id ?? "").trim() || !String(mapped?.path ?? "").trim()) {
        pushEntryError(errors, entryId, "malformed discovery mapping");
        continue;
      }

      if (!(await pathExists(mapped.path))) {
        pushEntryError(errors, entryId, `missing discovery path ${mapped.path}`);
      }
    }
  }

  return errors;
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(INVENTORY_PATH, "utf8"));
  const discovery = JSON.parse(await fs.readFile(DISCOVERY_PATH, "utf8"));
  const errors = await validateInventoryDocument(inventory);

  if (errors.length > 0) {
    for (const message of errors) {
      console.error(message);
    }
    fail(`${errors.length} inventory validation errors`);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
