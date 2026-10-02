import { gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const assets = path.resolve("dist/assets");
const files = (await readdir(assets)).filter((file) => file.endsWith(".js"));
const budget = Number(process.env.INITIAL_JS_BUDGET_GZIP_KB ?? 200);
const entryFile = files.find((file) => file.startsWith("index-"));
if (!entryFile) throw new Error("No built entry JS found in dist/assets");
const entry = await readFile(path.join(assets, entryFile));
const gzipKB = gzipSync(entry).byteLength / 1024;
const hasHeavyThreeRuntime = entry.toString().includes("WebGLRenderer") || entry.toString().includes("three.module");
console.log(`Initial JS: ${gzipKB.toFixed(1)} KB gzip (budget ${budget} KB)`);
if (hasHeavyThreeRuntime) throw new Error("three.js/WebGL runtime found in initial JS; lazy-load the visual module");
if (gzipKB > budget) throw new Error(`Initial JS exceeds ${budget} KB gzip`);
if (process.argv.includes("--self-test")) {
  const syntheticHeavyEntry = randomBytes((budget + 1) * 1024);
  if (gzipSync(syntheticHeavyEntry).byteLength / 1024 <= budget) throw new Error("Budget self-test failed to detect a synthetic oversized bundle");
  console.log("Budget self-test: oversized synthetic entry correctly rejected");
}
