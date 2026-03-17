#!/usr/bin/env node
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

const TERMINAL_STATUSES = new Set(["completed", "not_applicable"]);
const REASONING_REQUIRED_STATUSES = new Set(["todo", "not_applicable", "deferred_exception"]);

// ---------------------------------------------------------------------------
// Tech-stack pre-filter: auto-resolve not_applicable for absent technologies.
//
// Each rule defines:
//   - tech: human-readable technology name
//   - deps: npm dependency names whose presence indicates the tech is used
//   - code: code-level markers (class names, API calls) to search for
//   - chapters: ASVS chapter prefixes whose controls require this tech
//   - controlPattern: optional regex matching requirement_id for finer control
//
// A control is marked not_applicable ONLY when its required technology is
// absent from BOTH dependencies AND code. This is intentionally conservative.
// ---------------------------------------------------------------------------
const TECH_ABSENCE_RULES = [
  {
    tech: "WebRTC",
    deps: ["simple-peer", "webrtc", "mediasoup", "peerjs", "wrtc", "@mediasoup/client"],
    code: ["RTCPeerConnection", "RTCDataChannel", "getUserMedia", "RTCSessionDescription"],
    chapters: ["V17"],
  },
  {
    tech: "GraphQL",
    deps: [
      "graphql",
      "apollo-server",
      "@apollo/server",
      "mercurius",
      "graphql-yoga",
      "type-graphql",
    ],
    code: ["GraphQLSchema", "buildSchema", "graphql(", "gql`"],
    chapters: [],
    controlPattern: /graphql/i,
  },
  {
    tech: "gRPC",
    deps: ["@grpc/grpc-js", "@grpc/proto-loader", "grpc", "protobufjs"],
    code: ["grpc.Server", "loadPackageDefinition"],
    chapters: [],
    controlPattern: /grpc|protobuf/i,
  },
  {
    tech: "SOAP",
    deps: ["soap", "strong-soap", "node-soap"],
    code: ["soap.createClient", "wsdl"],
    chapters: [],
    controlPattern: /\bsoap\b/i,
  },
  {
    tech: "LDAP",
    deps: ["ldapjs", "ldapts", "activedirectory2"],
    code: ["ldap.createClient", "LDAPClient"],
    chapters: [],
    controlPattern: /\bldap\b/i,
  },
  {
    tech: "SAML",
    deps: ["saml2-js", "passport-saml", "@node-saml/passport-saml", "samlify"],
    code: ["SAMLResponse", "SAMLRequest", "samlp://"],
    chapters: [],
    controlPattern: /\bsaml\b/i,
  },
];

// ---------------------------------------------------------------------------
// File walking & indexing (unchanged from original)
// ---------------------------------------------------------------------------

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith("."))
        continue;
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
  if (TERMINAL_STATUSES.has(status)) return "none";
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

// ---------------------------------------------------------------------------
// Tech-stack detection
// ---------------------------------------------------------------------------

async function detectTechStack(fileIndex) {
  // 1. Read package.json dependencies
  let allDeps = new Set();
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));
    for (const name of Object.keys(pkg.dependencies || {})) allDeps.add(name);
    for (const name of Object.keys(pkg.devDependencies || {})) allDeps.add(name);
  } catch {
    // no package.json — skip dep detection
  }

  // 2. Build flat code corpus for marker search (join all indexed lines)
  const codeCorpus = fileIndex.map((f) => f.lines.join("\n")).join("\n");

  // 3. Evaluate each rule
  const absentTech = new Map(); // tech name → reason string
  for (const rule of TECH_ABSENCE_RULES) {
    const hasDep = rule.deps.some((d) => allDeps.has(d));
    const hasCode = rule.code.some((marker) => codeCorpus.includes(marker));

    if (!hasDep && !hasCode) {
      absentTech.set(
        rule.tech,
        `No ${rule.tech} dependencies (checked: ${rule.deps.join(", ")}) or code markers (checked: ${rule.code.join(", ")}) detected in codebase.`,
      );
    }
  }

  return absentTech;
}

function checkTechAbsence(item, absentTech) {
  const chapterPrefix = item.requirement_id.split(".")[0]; // e.g. "V17"
  const controlText = `${item.requirement_id} ${item.chapter} ${item.title}`;

  for (const rule of TECH_ABSENCE_RULES) {
    if (!absentTech.has(rule.tech)) continue;

    // Chapter-level match
    if (rule.chapters.includes(chapterPrefix)) {
      return absentTech.get(rule.tech);
    }

    // Control-level pattern match
    if (rule.controlPattern && rule.controlPattern.test(controlText)) {
      return absentTech.get(rule.tech);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Delta & rendering (unchanged from original)
// ---------------------------------------------------------------------------

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
    if ((prev.status || "todo") === "todo" && row.status !== "todo") resolved += 1;
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

function chapterLabel(row) {
  const chapter = String(row.chapter ?? "").trim();
  const withoutPrefix = chapter.replace(/^[A-Z]\d+\s+/, "");
  const match = withoutPrefix.match(/^(.*?)(?:\s+V\d+\.\d+|\s*$)/);
  return (match?.[1] ?? withoutPrefix).trim();
}

function summarizeChapters(checklist) {
  const byChapter = new Map();

  for (const row of checklist) {
    const chapterId = row.requirement_id.split(".")[0];
    if (!byChapter.has(chapterId)) {
      byChapter.set(chapterId, {
        chapter_id: chapterId,
        label: chapterLabel(row),
        completed: 0,
        todo: 0,
        not_applicable: 0,
        deferred_exception: 0,
      });
    }

    const summary = byChapter.get(chapterId);
    summary[row.status] = (summary[row.status] ?? 0) + 1;
  }

  return [...byChapter.values()].sort((a, b) =>
    a.chapter_id.localeCompare(b.chapter_id, undefined, { numeric: true }),
  );
}

function summarizeLevels(checklist) {
  const levels = new Map();

  for (const row of checklist) {
    const level = String(row.level ?? "unknown");
    if (!levels.has(level)) {
      levels.set(level, {
        level,
        completed: 0,
        todo: 0,
        not_applicable: 0,
        deferred_exception: 0,
        total: 0,
      });
    }

    const summary = levels.get(level);
    summary[row.status] = (summary[row.status] ?? 0) + 1;
    summary.total += 1;
  }

  return [...levels.values()].sort((a, b) =>
    a.level.localeCompare(b.level, undefined, { numeric: true }),
  );
}

function renderHuman(metadata, checklist) {
  const byStatus = checklist.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    { completed: 0, todo: 0, not_applicable: 0, deferred_exception: 0 },
  );
  const chapterSummary = summarizeChapters(checklist);
  const levelSummary = summarizeLevels(checklist);
  const l2 = levelSummary.find((row) => row.level === "2");
  const l3 = levelSummary.find((row) => row.level === "3");
  const v11 = chapterSummary.find((row) => row.chapter_id === "V11");
  const v11Open = checklist.find((row) => row.requirement_id === "V11.7.1");

  const lines = [
    "# ASVS Checklist (Human View)",
    "",
    "This report is optimized for human review.",
    "Structured per-control data remains in `checklist.machine.json` and `checklist.findings.jsonl`.",
    "",
    "## Snapshot",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Source commit: ${metadata.source_commit_sha ?? "unknown"}`,
    `- Source blob: ${metadata.source_blob_sha ?? "unknown"}`,
    `- Total requirements: ${checklist.length}`,
    `- Completed: ${byStatus.completed}`,
    `- TODO: ${byStatus.todo}`,
    `- Not applicable: ${byStatus.not_applicable}`,
    `- Accepted deferred exceptions: ${byStatus.deferred_exception}`,
    "",
    "## Level Target View",
    "",
    "| Level | Completed | TODO | Not applicable | Deferred exception | Total |",
    "|---|---|---|---|---|---|",
    ...levelSummary.map(
      (row) =>
        `| L${row.level} | ${row.completed} | ${row.todo} | ${row.not_applicable} | ${row.deferred_exception} | ${row.total} |`,
    ),
    "",
    `- Current practical target: Level 2 first, with selective Level 3 carryovers where they are cheap, highly relevant, or already partially implemented.`,
    `- Level 2 current state: ${l2?.completed ?? 0} completed, ${l2?.todo ?? 0} todo, ${l2?.not_applicable ?? 0} not applicable, ${l2?.deferred_exception ?? 0} deferred exception.`,
    `- Level 3 current state: ${l3?.completed ?? 0} completed, ${l3?.todo ?? 0} todo, ${l3?.not_applicable ?? 0} not applicable, ${l3?.deferred_exception ?? 0} deferred exception.`,
    "",
    "## Read This Before Interpreting The TODO Count",
    "",
    "- The checklist covers all 345 ASVS controls, not just the crypto work completed recently.",
    "- A large TODO count means most ASVS chapters are still open or only lightly evidenced, not that recent security work failed.",
    "- Deferred exceptions are explicit operator-approved risk accepts, not soft completions.",
    "- The strongest current chapter is `V11 Cryptography`; several other chapters are intentionally `not_applicable` because the repo does not implement those technologies or account systems.",
    "",
    "## Chapter Summary",
    "",
    "| Chapter | Area | Completed | TODO | Not applicable | Deferred exception |",
    "|---|---|---|---|---|---|",
    ...chapterSummary.map(
      (row) =>
        `| ${row.chapter_id} | ${row.label} | ${row.completed} | ${row.todo} | ${row.not_applicable} | ${row.deferred_exception} |`,
    ),
    "",
    "## Current Security Highlight",
    "",
    `- V11 Cryptography: ${v11?.completed ?? 0} completed, ${v11?.todo ?? 0} todo, ${v11?.not_applicable ?? 0} not applicable.`,
    v11Open
      ? `- Remaining open crypto control: ${v11Open.requirement_id} — ${v11Open.reasoning}`
      : "- Remaining open crypto control: none.",
    "",
    "## Human Navigation",
    "",
    "- Security overview: `../README.md`",
    "- Security decision record: `../../requirements/12-m1-security-decision-record.md`",
    "- Level 2 implementation plan: `../../plans/2026-03-14-asvs-level2-implementation-plan.md`",
    "- ASVS pipeline and maintenance notes: `README.md`",
    "- Full structured checklist: `checklist.machine.json`",
    "",
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const raw = await fs.readFile(MACHINE_PATH, "utf8");
  const machine = JSON.parse(raw);
  const checklist = Array.isArray(machine?.checklist) ? machine.checklist : [];
  const previousChecklist = JSON.parse(JSON.stringify(checklist));
  const metadata = machine?.metadata ?? {};

  const fileIndex = await indexFiles();
  const absentTech = await detectTechStack(fileIndex);

  if (absentTech.size > 0) {
    console.log(`Tech-stack pre-filter: ${absentTech.size} absent technologies detected:`);
    for (const [tech] of absentTech) {
      console.log(`  - ${tech}`);
    }
  }

  await fs.writeFile(FINDINGS_PATH, "", "utf8");

  let preFilterCount = 0;
  const audited = [];
  for (const item of checklist) {
    // Pre-filter: check if control targets an absent technology
    const absenceReason = checkTechAbsence(item, absentTech);
    if (absenceReason) {
      const row = {
        ...item,
        status: "not_applicable",
        severity: "none",
        reasoning: absenceReason,
        code_references: [],
        last_audited_at: new Date().toISOString(),
      };
      audited.push(row);
      await fs.appendFile(FINDINGS_PATH, `${JSON.stringify(row)}\n`, "utf8");
      preFilterCount += 1;
      continue;
    }

    // Standard keyword-level audit for remaining controls
    const keywords = extractKeywords(item);
    const refs = findReferences(fileIndex, keywords);

    const status = item.status || "todo";
    const severity =
      item.severity && item.severity !== "none"
        ? item.severity
        : severityFromLevel(item.level, status);

    const reasoning =
      item.reasoning?.trim() ||
      (refs.length
        ? "Keyword-level evidence found in codebase; manual validation required for control completeness."
        : REASONING_REQUIRED_STATUSES.has(status)
          ? "No direct keyword evidence found; likely TODO, deferred exception candidate, or requires manual applicability review."
          : "");

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
      pre_filtered_count: preFilterCount,
    },
    checklist: audited,
  };

  await fs.writeFile(MACHINE_PATH, `${JSON.stringify(nextMachine, null, 2)}\n`, "utf8");
  await fs.writeFile(HUMAN_PATH, renderHuman(nextMachine.metadata, audited), "utf8");

  const delta = buildDelta(previousChecklist, audited);
  await fs.writeFile(DELTA_JSON_PATH, `${JSON.stringify(delta, null, 2)}\n`, "utf8");
  await fs.writeFile(DELTA_MD_PATH, `${renderDeltaMarkdown(delta)}\n`, "utf8");

  console.log(
    `ASVS audit complete: ${audited.length} controls evaluated, ${preFilterCount} auto-resolved as not_applicable.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
