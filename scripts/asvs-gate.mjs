#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ASVS_DIR = path.resolve("docs/security/asvs");
const MACHINE_PATH = path.join(ASVS_DIR, "checklist.machine.json");
const SOURCE_STATE_PATH = path.join(ASVS_DIR, "source-state.json");

function fail(msg) {
  console.error(`ASVS gate failed: ${msg}`);
  process.exit(1);
}

async function main() {
  const raw = await fs.readFile(MACHINE_PATH, "utf8");
  const machine = JSON.parse(raw);
  const checklist = Array.isArray(machine?.checklist) ? machine.checklist : [];

  if (!checklist.length) fail("checklist is empty");

  const unknownIds = checklist.filter((x) => !x.requirement_id || x.requirement_id === "unknown").length;
  if (unknownIds > 0) fail(`${unknownIds} checklist rows have unknown requirement_id`);

  const missingReasoning = checklist.filter(
    (x) => ["todo", "not_applicable"].includes(x.status) && !String(x.reasoning || "").trim(),
  ).length;
  if (missingReasoning > 0) fail(`${missingReasoning} rows missing reasoning for todo/not_applicable`);

  // Read source state for summary
  let sourceState = {};
  try {
    sourceState = JSON.parse(await fs.readFile(SOURCE_STATE_PATH, "utf8"));
  } catch {
    // source-state.json may not exist yet
  }

  // Compute counts
  const byStatus = {};
  const bySeverity = {};
  for (const item of checklist) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    if (item.severity) bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
  }

  // Emit structured summary to stdout
  const summary = {
    gate: "PASSED",
    upstream_commit_sha: sourceState.upstream_commit_sha ?? "unknown",
    source_blob_sha: sourceState.asvs_source_blob_sha ?? "unknown",
    asvs_version: sourceState.asvs_detected_version ?? "unknown",
    checklist_items: checklist.length,
    unknown_ids: unknownIds,
    missing_reasoning: missingReasoning,
    pre_filtered: machine?.metadata?.pre_filtered_count ?? 0,
    by_status: byStatus,
    by_severity: bySeverity,
  };

  console.log("");
  console.log("--- ASVS GATE SUMMARY ---");
  console.log(`gate:               ${summary.gate}`);
  console.log(`upstream_commit:    ${summary.upstream_commit_sha}`);
  console.log(`source_blob:        ${summary.source_blob_sha}`);
  console.log(`asvs_version:       ${summary.asvs_version}`);
  console.log(`checklist_items:    ${summary.checklist_items}`);
  console.log(`unknown_ids:        ${summary.unknown_ids}`);
  console.log(`missing_reasoning:  ${summary.missing_reasoning}`);
  console.log(`pre_filtered:       ${summary.pre_filtered}`);
  console.log(`by_status:          ${JSON.stringify(summary.by_status)}`);
  console.log(`by_severity:        ${JSON.stringify(summary.by_severity)}`);
  console.log("--- END SUMMARY ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
