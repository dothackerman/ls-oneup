#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const REPO = "OWASP/ASVS";
const REF = "master";
const OUT_DIR = path.resolve("docs/security/asvs");
const SOURCE_STATE_PATH = path.join(OUT_DIR, "source-state.json");
const HISTORY_PATH = path.join(OUT_DIR, "version-history.jsonl");
const CHECKLIST_MACHINE_PATH = path.join(OUT_DIR, "checklist.machine.json");
const CHECKLIST_HUMAN_PATH = path.join(OUT_DIR, "checklist.human.md");

const FLAT_JSON =
  "5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json";

async function ghApi(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ls-oneup-asvs-sync",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${url}`);
  }
  return res.json();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeItem(item) {
  const reqId =
    item.req_id || item.shortcode || item.id || item.requirementId || item.code || item.requirement_id;
  const title = item.req_description || item.name || item.title || item.requirement || "(untitled)";
  const chapter = [item.chapter_id, item.chapter_name, item.section_id, item.section_name]
    .filter(Boolean)
    .join(" ") ||
    item.chapter ||
    item.section ||
    item.category ||
    "unknown";
  const level = item.L || item.level || item.asvs_level || item.maturity || "unknown";
  return {
    requirement_id: String(reqId ?? "unknown"),
    chapter: String(chapter),
    title: String(title),
    level: String(level),
    status: "todo",
    severity: "none",
    reasoning: "",
    code_references: [],
    source: {
      upstream_version: "5.0.0",
      upstream_path: FLAT_JSON,
    },
  };
}

function parseChecklist(raw) {
  if (Array.isArray(raw)) return raw.map(normalizeItem);
  if (Array.isArray(raw?.requirements)) return raw.requirements.map(normalizeItem);
  if (Array.isArray(raw?.controls)) return raw.controls.map(normalizeItem);
  if (Array.isArray(raw?.items)) return raw.items.map(normalizeItem);

  const values = [];
  if (raw && typeof raw === "object") {
    for (const v of Object.values(raw)) {
      if (Array.isArray(v)) values.push(...v);
    }
  }
  return values.map(normalizeItem);
}

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function readJsonIfExists(p) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toHumanMarkdown(sourceState, checklist) {
  const header = [
    "# ASVS Checklist (Human View)",
    "",
    `- Upstream repo: ${sourceState.upstream_repo}`,
    `- Upstream ref: ${sourceState.upstream_ref}`,
    `- Upstream commit: ${sourceState.upstream_commit_sha}`,
    `- ASVS source file: ${sourceState.asvs_source_path}`,
    `- Last checked: ${sourceState.last_checked_at}`,
    "",
    "| Requirement | Chapter | Level | Status | Severity | Code references | Reasoning |",
    "|---|---|---|---|---|---|---|",
  ];

  const rows = checklist.map((row) => {
    const refs = row.code_references?.length ? row.code_references.join("<br>") : "";
    const reasoning = row.reasoning ? row.reasoning.replaceAll("|", "\\|") : "";
    return `| ${row.requirement_id} | ${row.chapter} | ${row.level} | ${row.status} | ${row.severity} | ${refs} | ${reasoning} |`;
  });

  return `${header.join("\n")}\n${rows.join("\n")}\n`;
}

async function main() {
  await ensureDir();

  const commitInfo = await ghApi(
    `https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(REF)}`,
  );
  const flatJsonMeta = await ghApi(
    `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(FLAT_JSON)}?ref=${encodeURIComponent(REF)}`,
  );

  const rawChecklistRes = await fetch(flatJsonMeta.download_url, {
    headers: { "User-Agent": "ls-oneup-asvs-sync" },
  });
  if (!rawChecklistRes.ok) {
    throw new Error(`Failed downloading ASVS flat json: ${rawChecklistRes.status}`);
  }
  const rawChecklist = await rawChecklistRes.json();
  const parsedChecklist = parseChecklist(rawChecklist);

  const previous = await readJsonIfExists(SOURCE_STATE_PATH);

  const sourceState = {
    upstream_repo: REPO,
    upstream_ref: REF,
    upstream_commit_sha: commitInfo.sha,
    upstream_commit_date: commitInfo.commit?.committer?.date ?? null,
    asvs_source_path: FLAT_JSON,
    asvs_source_blob_sha: flatJsonMeta.sha,
    asvs_source_size: flatJsonMeta.size,
    asvs_detected_version: "5.0.0",
    checklist_item_count: parsedChecklist.length,
    last_checked_at: new Date().toISOString(),
  };

  await fs.writeFile(SOURCE_STATE_PATH, `${JSON.stringify(sourceState, null, 2)}\n`, "utf8");

  const historyEntry = {
    checked_at: sourceState.last_checked_at,
    upstream_commit_sha: sourceState.upstream_commit_sha,
    asvs_source_blob_sha: sourceState.asvs_source_blob_sha,
    asvs_detected_version: sourceState.asvs_detected_version,
    checklist_item_count: sourceState.checklist_item_count,
    changed_since_last_check:
      !previous ||
      previous.upstream_commit_sha !== sourceState.upstream_commit_sha ||
      previous.asvs_source_blob_sha !== sourceState.asvs_source_blob_sha,
  };
  await fs.appendFile(HISTORY_PATH, `${JSON.stringify(historyEntry)}\n`, "utf8");

  const existingChecklistDoc = await readJsonIfExists(CHECKLIST_MACHINE_PATH);
  const existingChecklist = Array.isArray(existingChecklistDoc)
    ? existingChecklistDoc
    : Array.isArray(existingChecklistDoc?.checklist)
      ? existingChecklistDoc.checklist
      : [];
  const existingById = new Map(existingChecklist.map((x) => [x.requirement_id, x]));

  const mergedChecklist = parsedChecklist.map((row) => {
    const existing = existingById.get(row.requirement_id);
    if (!existing) return row;
    return {
      ...row,
      status: existing.status ?? row.status,
      severity: existing.severity ?? row.severity,
      reasoning: existing.reasoning ?? row.reasoning,
      code_references: asArray(existing.code_references),
    };
  });

  await fs.writeFile(
    CHECKLIST_MACHINE_PATH,
    `${JSON.stringify(
      {
        metadata: {
          generated_at: sourceState.last_checked_at,
          source_repo: REPO,
          source_ref: REF,
          source_commit_sha: sourceState.upstream_commit_sha,
          source_blob_sha: sourceState.asvs_source_blob_sha,
          source_path: FLAT_JSON,
        },
        checklist: mergedChecklist,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await fs.writeFile(CHECKLIST_HUMAN_PATH, toHumanMarkdown(sourceState, mergedChecklist), "utf8");

  console.log(
    `ASVS sync complete: ${mergedChecklist.length} items (commit ${sourceState.upstream_commit_sha.slice(0, 12)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
