/**
 * Turns LHCI's assertion results into GitHub check-run annotations.
 *
 * Same reason as `report-vitest-failures.mjs`: the job log is not always reachable from where the
 * failure gets triaged (artifact downloads go to a storage host that some networks cannot reach),
 * while the annotations API always answers. Annotations also survive next to the failing step.
 *
 * Usage: node web/scripts/report-lighthouse-failures.mjs [path/to/assertion-results.json]
 */
import { readFileSync } from "node:fs";

const MAX_ANNOTATIONS = 10;

const path = process.argv[2] ?? ".lighthouseci/assertion-results.json";
let rows = [];
try {
  rows = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  console.log(`::error::lighthouse produced no assertion results (${path}): ${error.message}`);
  process.exit(0);
}

const failed = rows.filter((row) => row.level === "error" && row.passed === false);
if (!failed.length) {
  console.log("::warning::lighthouse failed but left no failed assertion — inspect the autorun log.");
  process.exit(0);
}

/** One annotation per failing URL+assertion: the offending value is what makes it actionable. */
for (const row of failed.slice(0, MAX_ANNOTATIONS)) {
  const actual = row.actual === undefined ? "" : ` (actual: ${typeof row.actual === "number" ? row.actual.toFixed(3) : row.actual})`;
  const expected = row.expected === undefined ? "" : ` expected ${row.expected}${row.operator ?? ""}`;
  const message = `${row.url ?? "?"} — ${row.auditId ?? row.auditProperty}: ${row.auditTitle ?? ""}${expected}${actual}`.slice(0, 900);
  console.log(`::error file=web/lighthouserc.cjs,title=lighthouse::${message}`);
}
console.log(`${failed.length} failing Lighthouse assertion(s) across ${new Set(failed.map((row) => row.url)).size} URL(s).`);
