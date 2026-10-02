// Print Playwright JSON-reporter failures as GitHub workflow annotations.
//
// Why this exists: the raw Actions log blobs are not always reachable (they 404/EOF from
// some networks) while check-run annotations are readable through the API. GitHub keeps
// only ~10 annotations per check run, so the output is deliberately *aggregated*:
//   1 annotation  = run summary + which specs failed
//   2-8           = deduplicated axe violations (rule, element, colours, ratio, pages)
// Usage:
//   PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/a11y.json playwright test --reporter=list,json
//   node web/scripts/report-playwright-failures.mjs /tmp/a11y.json
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "/tmp/a11y.json";
const MAX_ANNOTATIONS = 8;
const MAX_CHARS = 1800;

const stripAnsi = (value) => String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");

// Workflow commands need %, \r and \n escaped, otherwise the annotation is truncated.
const command = (message) =>
  `::error::${message.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, " | ").slice(0, MAX_CHARS)}`;

const flatten = (value) =>
  String(value ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

/** axe violations are printed inside the expect() message as pretty JSON — pull them back out. */
const parseViolations = (message) => {
  const text = stripAnsi(message);
  const head = text.split("expect(received)")[0].replace(/^Error:\s*/, "").trim();
  if (!head.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(head);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.log(command(`no readable Playwright JSON report at ${file} (${error.message}) — the suite died before the tests ran`));
  process.exit(0);
}

const stats = report.stats ?? {};
const failures = [];
const walk = (suites) => {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== "expected") {
          failures.push({
            file: suite.file ?? spec.file ?? "?",
            title: spec.title,
            status: test.status,
            message: test.results?.[0]?.error?.message ?? "",
          });
        }
      }
    }
    walk(suite.suites);
  }
};
walk(report.suites);

const describe = (title) => {
  const match = title.match(/^([a-z]{2}) (\S*)/);
  return match ? `${match[1]} ${match[2] || "/"}` : title;
};

const ruleCounts = new Map();
const buckets = new Map();
for (const failure of failures) {
  const violations = parseViolations(failure.message);
  if (!violations.length) {
    const key = `no-structured-report|${flatten(failure.message).slice(0, 200)}`;
    const bucket = buckets.get(key) ?? { rule: "unparsed", detail: flatten(failure.message).slice(0, 200), pages: [] };
    bucket.pages.push(describe(failure.title));
    buckets.set(key, bucket);
    continue;
  }
  for (const violation of violations) {
    ruleCounts.set(violation.id, (ruleCounts.get(violation.id) ?? 0) + (violation.nodes?.length ?? 0));
    for (const node of violation.nodes ?? []) {
      const data = node.any?.[0]?.data ?? {};
      const detail = [
        flatHtml(node.html),
        `target=${flatten(Array.isArray(node.target) ? node.target.join(" ") : node.target).slice(0, 120)}`,
        data.fgColor ? `fg=${data.fgColor}` : "",
        data.bgColor ? `bg=${data.bgColor}` : "",
        data.contrastRatio ? `ratio=${data.contrastRatio}` : "",
        data.expectedContrastRatio ? `need=${data.expectedContrastRatio}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const key = `${violation.id}|${detail}`;
      const bucket = buckets.get(key) ?? { rule: violation.id, detail, pages: [] };
      bucket.pages.push(describe(failure.title));
      buckets.set(key, bucket);
    }
  }
}

function flatHtml(html) {
  return flatten(html).replace(/^<[a-z-]+[^>]*>/, (tag) => tag.slice(0, 160)).slice(0, 190);
}

const summaryBits = [
  `unexpected=${stats.unexpected ?? 0} expected=${stats.expected ?? 0} flaky=${stats.flaky ?? 0} skipped=${stats.skipped ?? 0}`,
  `rules=${[...ruleCounts].map(([id, count]) => `${id}×${count}`).join(", ") || "none"}`,
  `specs=${[...new Set(failures.map((failure) => failure.file))].join(", ") || "none"}`,
  `failing=${[...new Set(failures.map((failure) => describe(failure.title)))].join(", ")}`,
];
console.log(command(summaryBits.join(" ~ ")));
if (!failures.length) {
  console.log(command("the JSON report lists no failed test — look for a webServer or global error"));
  process.exit(0);
}

const entries = [...buckets.values()].sort((a, b) => b.pages.length - a.pages.length);
const chunks = [];
let current = "";
for (const entry of entries) {
  const pages = [...new Set(entry.pages)];
  const line = `[${entry.rule} ×${pages.length}] ${entry.detail} ~ pages: ${pages.slice(0, 4).join(", ")}${pages.length > 4 ? ` +${pages.length - 4}` : ""}`;
  if (current && current.length + line.length > MAX_CHARS - 40) {
    chunks.push(current);
    current = "";
  }
  current += (current ? " || " : "") + line;
}
if (current) chunks.push(current);

const budget = chunks.slice(0, MAX_ANNOTATIONS - 1);
if (chunks.length > budget.length) {
  budget[budget.length - 1] += ` || …${chunks.length - budget.length} more chunks omitted (increase the annotation budget or fix the top offenders first)`;
}
for (const chunk of budget) console.log(command(`axe: ${chunk}`));
for (const error of (report.errors ?? []).slice(0, 2)) console.log(command(`suite error: ${flatten(error.message).slice(0, MAX_CHARS - 40)}`));
