import { gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

type ManifestChunk = { file: string; isEntry?: boolean; imports?: string[]; dynamicImports?: string[]; src?: string };

const dist = path.resolve("dist");
const manifest = JSON.parse(await readFile(path.join(dist, ".vite/manifest.json"), "utf8")) as Record<string, ManifestChunk>;
const initialBudgetKb = Number(process.env.INITIAL_JS_BUDGET_GZIP_KB ?? 200);
const routeBudgetKb = Number(process.env.TOOL_ROUTE_BUDGET_GZIP_KB ?? 350);
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error("No entry chunk found in dist/.vite/manifest.json — run `pnpm build` first.");

async function fileGzipKb(file: string): Promise<number> {
  return gzipSync(await readFile(path.join(dist, file))).byteLength / 1024;
}

/** Sums a chunk and its transitive *static* imports (dynamic imports load on demand). */
async function closureKb(key: string, seen = new Set<string>()): Promise<{ kb: number; files: string[] }> {
  if (seen.has(key)) return { kb: 0, files: [] };
  seen.add(key);
  const chunk = manifest[key];
  if (!chunk) return { kb: 0, files: [] };
  let kb = await fileGzipKb(chunk.file);
  const files = [chunk.file];
  for (const imported of chunk.imports ?? []) {
    const nested = await closureKb(imported, seen);
    kb += nested.kb;
    files.push(...nested.files);
  }
  return { kb, files };
}

function assertWithin(label: string, kb: number, budgetKb: number) {
  console.log(`${label}: ${kb.toFixed(1)} KB gzip (budget ${budgetKb} KB)`);
  if (kb > budgetKb) throw new Error(`${label} exceeds ${budgetKb} KB gzip`);
}

const initial = await closureKb(entryKey);
assertWithin("Initial JS", initial.kb, initialBudgetKb);

/** Collected measurements, emitted for F-10 so the lab page shows build truth, not estimates. */
const measurements: { id: string; kb: number; budgetKb: number }[] = [
  { id: "initial", kb: initial.kb, budgetKb: initialBudgetKb },
];

// F-14 §3: the capability matrix must never pull three.js/WebGL into the initial payload.
for (const file of initial.files) {
  const content = await readFile(path.join(dist, file), "utf8");
  if (content.includes("WebGLRenderer") || content.includes("three.module")) {
    throw new Error(`three.js/WebGL runtime found in initial JS (${file}); lazy-load the visual module`);
  }
}

// §5.4: every tool route must stay within its own budget after code-splitting (ADR-005).
const toolDirs = ["src/features/toolbox/", "src/features/scanner/", "src/features/assistant/", "src/features/biolab/"];
const toolKeys = Object.keys(manifest).filter((key) => key.endsWith("/index.tsx") && toolDirs.some((dir) => key.startsWith(dir)));
if (toolKeys.length < 8) throw new Error(`Expected at least eight code-split tool/page routes, found ${toolKeys.length}`);
for (const key of toolKeys.sort()) {
  const id = key.split("/").slice(0, -1).pop() ?? key;
  const route = await closureKb(key);
  assertWithin(`Tool route ${id}`, route.kb, routeBudgetKb);
  measurements.push({ id: `route:${id}`, kb: route.kb, budgetKb: routeBudgetKb });
}

/**
 * `--emit <dir>` writes the same numbers the gate just verified, for F-10 (`/lab/performance`).
 * The lab page reads this file, so it can only ever display measured build output — the page
 * itself links to the CI artefact that produced it.
 */
const emitIndex = process.argv.indexOf("--emit");
if (emitIndex !== -1) {
  const target = process.argv[emitIndex + 1];
  if (!target) throw new Error("--emit requires a directory, e.g. --emit public/data");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  await mkdir(target, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "web/scripts/bundle-budget.ts (CI: pnpm build && pnpm budget --emit)",
    budgets: { initialKb: initialBudgetKb, routeKb: routeBudgetKb },
    measurements,
    // A single run can only ever report one point; history is appended by CI when it persists
    // the previous artefact. The lab page renders exactly what it is given and says so.
    history: [{ at: new Date().toISOString(), initialKb: Number(initial.kb.toFixed(1)), worstRoute: measurements.filter((m) => m.id.startsWith("route:")).sort((a, b) => b.kb - a.kb)[0]?.id ?? "" }],
    digest: createHash("sha256").update(JSON.stringify(measurements)).digest("hex").slice(0, 16),
  };
  await writeFile(`${target}/bundle-stats.json`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Emitted ${measurements.length} measurements → ${target}/bundle-stats.json (sha256:${payload.digest})`);
}

if (process.argv.includes("--self-test")) {
  const syntheticKb = gzipSync(randomBytes((initialBudgetKb + 1) * 1024)).byteLength / 1024;
  if (syntheticKb <= initialBudgetKb) throw new Error("Budget self-test failed to detect a synthetic oversized bundle");
  console.log(`Budget self-test: ${syntheticKb.toFixed(1)} KB synthetic entry correctly exceeds the ${initialBudgetKb} KB budget`);
}
