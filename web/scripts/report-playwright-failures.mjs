// Print Playwright failures as GitHub workflow annotations.
//
// Why this exists: the raw Actions log blobs are not always reachable (they 404/EOF from some
// networks) while check-run annotations are readable through the API. GitHub keeps only ~10
// annotations per check run, so the output is aggregated and prioritised:
//   1 annotation  = run summary (stats, rules, failing specs)
//   2-7           = deduplicated axe violations: rule, element, target, colours, ratio, pages
//   last          = the remaining (non-axe) failures, one line each
// The accessibility spec dumps its raw violations to $A11Y_REPORT, which is parsed here instead
// of the (truncated, colourised) expect() message.
// Usage:
//   A11Y_REPORT=/tmp/axe-violations.json PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/a11y.json \
//     playwright test --reporter=list,json
//   node web/scripts/report-playwright-failures.mjs /tmp/a11y.json /tmp/axe-violations.json
import { existsSync, readFileSync } from "node:fs";

const reportFile = process.argv[2] ?? "/tmp/a11y.json";
const axeFile = process.argv[3] ?? process.env.A11Y_REPORT ?? "/tmp/axe-violations.json";
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

const describe = (title) => {
  const match = title.match(/^([a-z]{2}) (\S*)/);
  return match ? `${match[1]} ${match[2] || "/"}` : title;
};

let report = { stats: {}, suites: [], errors: [] };
if (existsSync(reportFile)) {
  try {
    report = JSON.parse(readFileSync(reportFile, "utf8"));
  } catch (error) {
    console.log(command(`${reportFile} is not valid JSON (${error.message})`));
  }
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
            message: stripAnsi(test.results?.[0]?.error?.message ?? ""),
          });
        }
      }
    }
    walk(suite.suites);
  }
};
walk(report.suites);

/** $A11Y_REPORT is JSON-lines: one {route, violations} record per failing page. */
const axePages = [];
if (existsSync(axeFile)) {
  for (const line of readFileSync(axeFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      axePages.push(JSON.parse(line));
    } catch {
      // a partial last line (the run was killed mid-write) is not worth reporting
    }
  }
}

const ruleCounts = new Map();
const buckets = new Map();
for (const page of axePages) {
  for (const violation of page.violations ?? []) {
    ruleCounts.set(violation.id, (ruleCounts.get(violation.id) ?? 0) + (violation.nodes?.length ?? 0));
    for (const node of violation.nodes ?? []) {
      const data = node.data ?? {};
      const detail = [
        flatten(node.html).slice(0, 190),
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
      bucket.pages.push(page.route ?? "?");
      buckets.set(key, bucket);
    }
  }
}

// Failures of specs that do not run axe (locator/timeout errors) still deserve a line each.
const otherFailures = failures.filter((failure) => !failure.message.includes("color-contrast") && !failure.message.includes("scrollable-region"));

console.log(
  command(
    [
      `unexpected=${stats.unexpected ?? 0} expected=${stats.expected ?? 0} flaky=${stats.flaky ?? 0}`,
      `axeRules=${[...ruleCounts].map(([id, count]) => `${id}×${count}`).join(", ") || "none"}`,
      `axePages=${axePages.length}`,
      `failingSpecs=${[...new Set(failures.map((failure) => failure.file))].join(", ") || "none"}`,
      `pages=${[...new Set(failures.map((failure) => describe(failure.title)))].join(", ")}`,
    ].join(" ~ "),
  ),
);

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

const budget = chunks.slice(0, MAX_ANNOTATIONS - 2);
if (chunks.length > budget.length) {
  budget[budget.length - 1] += ` || …${chunks.length - budget.length} more violation chunks omitted`;
}
for (const chunk of budget) console.log(command(`axe: ${chunk}`));

if (otherFailures.length) {
  const lines = otherFailures.map((failure) => `${failure.file} › ${failure.title} :: ${flatten(failure.message).slice(0, 220)}`);
  let out = "";
  for (const line of lines) {
    if (out && out.length + line.length > MAX_CHARS - 40) {
      console.log(command(`failure: ${out}`));
      out = "";
    }
    out += (out ? " || " : "") + line;
  }
  if (out) console.log(command(`failure: ${out}`));
}

for (const error of (report.errors ?? []).slice(0, 2)) console.log(command(`suite error: ${flatten(error.message).slice(0, MAX_CHARS - 40)}`));
