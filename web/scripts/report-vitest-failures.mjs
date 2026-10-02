/**
 * Turns a vitest log into GitHub check-run annotations.
 *
 * A red `pnpm test` used to be a dead end in CI: the step's stdout is only visible in the job log,
 * and the job log has been undownloadable from this sandbox (the results receiver answers with an
 * EOF). Annotations, on the other hand, are readable with `gh api .../check-runs/<id>/annotations`
 * — the same channel `report-playwright-failures.mjs` uses for the browser tests.
 *
 * Usage: node web/scripts/report-vitest-failures.mjs /tmp/vitest.log
 */
import { readFileSync } from "node:fs";

const MAX_ANNOTATIONS = 12;
const MAX_MESSAGE = 900;

const path = process.argv[2] ?? "/tmp/vitest.log";
let log = "";
try {
  log = readFileSync(path, "utf8");
} catch {
  console.log(`::error::vitest log not found at ${path} — the test step failed before writing it.`);
  process.exit(0);
}

const lines = log.split(/\r?\n/);
const failures = [];
let current = null;

/** `❯ src/features/biolab/runner.test.ts:59:20` — vitest prints the failing assertion's location. */
const locationOf = (line) => {
  const match = /^\s*[❯>]\s+(\S+?):(\d+):(\d+)\s*$/.exec(line);
  return match ? { file: match[1], line: Number(match[2]) } : null;
};

for (const line of lines) {
  const head = /^\s*(?:FAIL|✗|×)\s+(\S+)(?:\s*>\s*(.*))?$/.exec(line);
  if (head) {
    current = { file: head[1], test: (head[2] ?? "").trim(), message: "", line: undefined };
    failures.push(current);
    continue;
  }
  if (!current) continue;
  if (!current.line) {
    const location = locationOf(line);
    if (location) {
      current.line = location.line;
      if (location.file.endsWith(".test.ts") || location.file.endsWith(".test.tsx")) current.file = location.file;
      continue;
    }
  }
  if (!current.message && /(Error|AssertionError|expected|Timed out|timeout):?/i.test(line) && line.trim()) {
    current.message = line.trim();
  }
}

const summary = lines.find((line) => /Test Files\s+.*(failed|passed)/.test(line));
const counts = lines.filter((line) => /^\s*Tests\s+/.test(line)).pop();

if (!failures.length) {
  console.log("::warning::vitest failed but no FAIL line was parsed — inspect the step summary tail.");
} else {
  for (const failure of failures.slice(0, MAX_ANNOTATIONS)) {
    const where = failure.line ? `file=${failure.file},line=${failure.line}` : `file=${failure.file}`;
    const title = failure.test || "vitest failure";
    const message = `${title} :: ${failure.message || "see the job summary"}`.slice(0, MAX_MESSAGE);
    console.log(`::error ${where},title=vitest::${message}`);
  }
  if (failures.length > MAX_ANNOTATIONS) {
    console.log(`::error::${failures.length} failing tests; only the first ${MAX_ANNOTATIONS} are annotated.`);
  }
}

for (const line of [summary, counts].filter(Boolean)) console.log(line.trim());
