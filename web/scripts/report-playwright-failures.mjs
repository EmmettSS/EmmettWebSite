// Print Playwright JSON-reporter failures as GitHub workflow annotations.
//
// CI needs this because the raw run logs are not always reachable (they 404/EOF from some
// networks), while check-run annotations stay readable through the API. Usage:
//   PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/a11y.json playwright test --reporter=list,json
//   node web/scripts/report-playwright-failures.mjs /tmp/a11y.json
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "/tmp/a11y.json";
const MAXLEN = 900;

const clean = (value) =>
  String(value ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" | ");

// Workflow commands need %, \r and \n escaped, otherwise the annotation is truncated.
const command = (level, message) =>
  `::${level}::${message.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, " | ").slice(0, MAXLEN)}`;

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.log(
    command("error", `no readable Playwright JSON report at ${file} (${error.message}) — the suite died before the tests ran`),
  );
  process.exit(0);
}

const stats = report.stats ?? {};
console.log(
  command(
    "error",
    `playwright summary unexpected=${stats.unexpected ?? 0} flaky=${stats.flaky ?? 0} skipped=${stats.skipped ?? 0} expected=${stats.expected ?? 0} duration=${stats.duration ?? 0}ms`,
  ),
);

const failures = [];
const walk = (suites) => {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== "expected") {
          const message = test.results?.[0]?.error?.message ?? "";
          failures.push(`${suite.file ?? spec.file ?? "?"} › ${spec.title} [${test.status}] ${clean(message)}`);
        }
      }
    }
    walk(suite.suites);
  }
};
walk(report.suites);

if (!failures.length) {
  console.log(command("error", "the JSON report lists no failed test — look for a webServer or global error"));
}
for (const failure of failures.slice(0, 40)) console.log(command("error", `a11y: ${failure}`));
for (const error of (report.errors ?? []).slice(0, 5)) console.log(command("error", `a11y-global: ${clean(error.message)}`));
