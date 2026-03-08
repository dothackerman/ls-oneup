#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import fs from "node:fs/promises";
import path from "node:path";

const MACHINE_PATH = path.resolve("docs/security/asvs/checklist.machine.json");

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

  console.log(
    `ASVS gate passed: ${checklist.length} rows, unknown_ids=${unknownIds}, missing_reasoning=${missingReasoning}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
