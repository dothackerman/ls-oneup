#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ASVS_DIR = path.resolve("docs/security/asvs");
const MACHINE_PATH = path.join(ASVS_DIR, "checklist.machine.json");
const HUMAN_PATH = path.join(ASVS_DIR, "checklist.human.md");
const FINDINGS_PATH = path.join(ASVS_DIR, "checklist.findings.jsonl");
const DELTA_JSON_PATH = path.join(ASVS_DIR, "checklist.delta.json");
const DELTA_MD_PATH = path.join(ASVS_DIR, "checklist.delta.md");

const SCAN_DIRS = ["src", "worker", "tests", "docs", "migrations"];
const EXCLUDED_PREFIXES = ["docs/security/asvs/"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".sql"]);

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "must",
  "shall",
  "should",
  "into",
  "over",
  "under",
  "than",
  "when",
  "where",
  "is",
  "are",
  "be",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "as",
  "an",
  "or",
  "not",
  "all",
  "any",
  "using",
  "use",
]);

async function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) continue;
      out.push(...(await walk(p)));
      continue;
    }
    if (!SCAN_EXT.has(path.extname(entry.name))) continue;
    out.push(p);
  }
  return out;
}

function extractKeywords(item) {
  const source = `${item.requirement_id} ${item.chapter} ${item.title}`.toLowerCase();
  const words = source
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 8);
}

function severityFromLevel(level, status) {
  if (status === "completed" || status === "not_applicable") return "none";
  const n = Number(level);
  if (Number.isFinite(n) && n >= 4) return "critical";
  if (Number.isFinite(n) && n >= 3) return "high";
  if (Number.isFinite(n) && n >= 2) return "medium";
  return "low";
}

async function indexFiles() {
  const files = [];
  for (const d of SCAN_DIRS) {
    files.push(...(await walk(path.join(ROOT, d))));
  }

  const indexed = [];
  for (const f of files) {
    try {
      const content = await fs.readFile(f, "utf8");
      const rel = path.relative(ROOT, f);
      if (EXCLUDED_PREFIXES.some((p) => rel.startsWith(p))) continue;
      indexed.push({
        path: rel,
        lines: content.split(/\r?\n/),
      });
    } catch {
      // ignore unreadable files
    }
  }
  return indexed;
}

function findReferences(index, keywords) {
  if (!keywords.length) return [];
  const refs = [];
  for (const file of index) {
    for (let i = 0; i < file.lines.length; i += 1) {
      const line = file.lines[i].toLowerCase();
      if (keywords.some((k) => line.includes(k))) {
        refs.push(`${file.path}:${i + 1}`);
        if (refs.length >= 8) return refs;
      }
    }
  }
  return refs;
}

function buildDelta(previous, current) {
  const prevById = new Map((previous || []).map((x) => [x.requirement_id, x]));
  const changed = [];
  let newTodos = 0;
  let resolved = 0;
  let severityChanged = 0;

  for (const row of current) {
    const prev = prevById.get(row.requirement_id);
    if (!prev) continue;
    const statusChanged = (prev.status || "todo") !== row.status;
    const sevChanged = (prev.severity || "none") !== row.severity;

    if (statusChanged || sevChanged) {
      changed.push({
        requirement_id: row.requirement_id,
        from_status: prev.status || "todo",
        to_status: row.status,
        from_severity: prev.severity || "none",
        to_severity: row.severity,
      });
    }

    if ((prev.status || "todo") !== "todo" && row.status === "todo") newTodos += 1;
    if ((prev.status || "todo") === "todo" && row.status === "completed") resolved += 1;
    if (sevChanged) severityChanged += 1;
  }

  return {
    generated_at: new Date().toISOString(),
    changed_count: changed.length,
    new_todos: newTodos,
    resolved_todos: resolved,
    severity_changed: severityChanged,
    changes: changed,
  };
}

function renderDeltaMarkdown(delta) {
  const lines = [
    "# ASVS Delta Report",
    "",
    `- Generated at: ${delta.generated_at}`,
    `- Changed controls: ${delta.changed_count}`,
    `- New TODOs: ${delta.new_todos}`,
    `- Resolved TODOs: ${delta.resolved_todos}`,
    `- Severity changes: ${delta.severity_changed}`,
    "",
    "| Requirement | Status (from→to) | Severity (from→to) |",
    "|---|---|---|",
    ...delta.changes.map(
      (c) =>
        `| ${c.requirement_id} | ${c.from_status} → ${c.to_status} | ${c.from_severity} → ${c.to_severity} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

function renderHuman(metadata, checklist) {
  const critical = checklist.filter((x) => x.status === "todo" && x.severity === "critical");
  const high = checklist.filter((x) => x.status === "todo" && x.severity === "high");

  const head = [
    "# ASVS Checklist (Human View)",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Source commit: ${metadata.source_commit_sha ?? "unknown"}`,
    `- Source blob: ${metadata.source_blob_sha ?? "unknown"}`,
    `- Total requirements: ${checklist.length}`,
    `- TODO critical: ${critical.length}`,
    `- TODO high: ${high.length}`,
    "",
    "## Top severity backlog",
    "",
  ];

  const sevRows = [...critical, ...high]
    .slice(0, 40)
    .map((x) => `- ${x.requirement_id} [${x.severity}] — ${x.title}`);

  const table = [
    "",
    "## Full checklist",
    "",
    "| Requirement | Chapter | Level | Status | Severity | Code references | Reasoning |",
    "|---|---|---|---|---|---|---|",
    ...checklist.map((row) => {
      const refs = row.code_references?.length ? row.code_references.join("<br>") : "";
      const reasoning = row.reasoning ? String(row.reasoning).replaceAll("|", "\\|") : "";
      return `| ${row.requirement_id} | ${row.chapter} | ${row.level} | ${row.status} | ${row.severity} | ${refs} | ${reasoning} |`;
    }),
    "",
  ];

  return `${head.join("\n")}\n${sevRows.join("\n")}\n${table.join("\n")}`;
}

async function main() {
  const raw = await fs.readFile(MACHINE_PATH, "utf8");
  const machine = JSON.parse(raw);
  const checklist = Array.isArray(machine?.checklist) ? machine.checklist : [];
  const previousChecklist = JSON.parse(JSON.stringify(checklist));
  const metadata = machine?.metadata ?? {};

  const fileIndex = await indexFiles();
  await fs.writeFile(FINDINGS_PATH, "", "utf8");

  const audited = [];
  for (const item of checklist) {
    const keywords = extractKeywords(item);
    const refs = findReferences(fileIndex, keywords);

    const status = item.status || "todo";
    const severity = item.severity && item.severity !== "none" ? item.severity : severityFromLevel(item.level, status);

    const reasoning =
      item.reasoning?.trim() ||
      (refs.length
        ? "Keyword-level evidence found in codebase; manual validation required for control completeness."
        : "No direct keyword evidence found; likely TODO or requires manual applicability review.");

    const row = {
      ...item,
      status,
      severity,
      reasoning,
      code_references: refs,
      last_audited_at: new Date().toISOString(),
    };

    audited.push(row);
    await fs.appendFile(FINDINGS_PATH, `${JSON.stringify(row)}\n`, "utf8");
  }

  const nextMachine = {
    ...machine,
    metadata: {
      ...metadata,
      last_audited_at: new Date().toISOString(),
      audited_item_count: audited.length,
    },
    checklist: audited,
  };

  await fs.writeFile(MACHINE_PATH, `${JSON.stringify(nextMachine, null, 2)}\n`, "utf8");
  await fs.writeFile(HUMAN_PATH, renderHuman(nextMachine.metadata, audited), "utf8");

  const delta = buildDelta(previousChecklist, audited);
  await fs.writeFile(DELTA_JSON_PATH, `${JSON.stringify(delta, null, 2)}\n`, "utf8");
  await fs.writeFile(DELTA_MD_PATH, `${renderDeltaMarkdown(delta)}\n`, "utf8");

  console.log(`ASVS audit complete: ${audited.length} controls evaluated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
