/**
 * Dev helper: get the *same* Chrome build CI uses, without the blocked Playwright CDN.
 *
 * `playwright install chromium` downloads from `cdn.playwright.dev`, which is unreachable from
 * some networks (including the sandbox this branch was built in). `@sparticuz/chromium` ships the
 * same Chrome for Testing binary as an npm tarball, so this script unpacks it into
 * `node_modules/.cache/emmett-local-browser/` (never committed) and prints what a run needs:
 *
 *   CHROME_PATH=$(node scripts/local-browser.mjs) \
 *   LD_LIBRARY_PATH=$(node scripts/local-browser.mjs --lib-dir) \
 *     npx @lhci/cli autorun          # or: corepack pnpm exec playwright test
 *
 * The version is pinned to the one Playwright bundles (`playwright-core/browsers.json`) so local
 * axe/Lighthouse runs measure the same engine as the CI gates. Everything is cached: the second
 * call is offline and instant.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(webDir, "node_modules", ".cache", "emmett-local-browser");
const executable = path.join(cacheDir, "chromium");
const libRoot = path.join(cacheDir, "libs");
const versionFile = path.join(cacheDir, "version");

function pinnedVersion() {
  const require_ = createRequire(import.meta.url);
  const candidates = [];
  try {
    const testPackageJson = realpathSync(require_.resolve("@playwright/test/package.json"));
    const registryDir = path.dirname(path.dirname(path.dirname(testPackageJson)));
    candidates.push(path.join(registryDir, "playwright-core", "browsers.json"));
    candidates.push(path.join(registryDir, "..", "playwright-core@*/node_modules/playwright-core/browsers.json"));
  } catch {
    /* @playwright/test is not installed next to us; the walk below still finds the manifest */
  }
  // Walk up from this file looking for a hoisted or pnpm-nested playwright-core.
  for (let dir = webDir; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    candidates.push(path.join(dir, "node_modules", "playwright-core", "browsers.json"));
    candidates.push(path.join(dir, "node_modules", ".pnpm", "*", "node_modules", "playwright-core", "browsers.json"));
  }
  for (const candidate of candidates) {
    for (const file of globFiles(candidate)) {
      const chromium = JSON.parse(readFileSync(file, "utf8")).browsers.find((browser) => browser.name === "chromium");
      if (chromium) {
        // "153.0.8010.12" → the matching npm package is published as "153.0.0".
        return `${chromium.browserVersion.split(".")[0]}.0.0`;
      }
    }
  }
  throw new Error("could not find playwright-core/browsers.json — run `pnpm install --frozen-lockfile` first");
}

/** Expands one `*` in a path segment (pnpm's versioned folders), returning the existing matches. */
function globFiles(pattern) {
  const parts = pattern.split(path.sep);
  const starIndex = parts.findIndex((part) => part === "*");
  if (starIndex === -1) return existsSync(pattern) ? [pattern] : [];
  const root = parts.slice(0, starIndex).join(path.sep);
  if (!existsSync(root)) return [];
  const rest = parts.slice(starIndex + 1);
  return readdirSync(root)
    .map((entry) => path.join(root, entry, ...rest))
    .filter((file) => existsSync(file));
}

/** `al2023.tar.br` unpacks to `lib/`; tolerate a flat layout from older packages too. */
function libDir() {
  const nested = path.join(libRoot, "lib");
  return existsSync(path.join(nested, "libnss3.so")) ? nested : libRoot;
}

function unpack(version) {
  const workDir = path.join(cacheDir, `.tmp-${process.pid}`);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  const tarball = execFileSync("npm", ["pack", `@sparticuz/chromium@${version}`], { cwd: workDir, encoding: "utf8" })
    .trim()
    .split("\n")
    .pop();
  execFileSync("tar", ["xzf", tarball], { cwd: workDir });
  const binDir = path.join(workDir, "package", "bin");

  writeFileSync(executable, brotliDecompressSync(readFileSync(path.join(binDir, "chromium.br"))));
  execFileSync("chmod", ["+x", executable]);

  mkdirSync(libRoot, { recursive: true });
  const libsTarball = path.join(workDir, "libs.tar");
  writeFileSync(libsTarball, brotliDecompressSync(readFileSync(path.join(binDir, "al2023.tar.br"))));
  execFileSync("tar", ["xf", libsTarball, "-C", libRoot]);

  rmSync(workDir, { recursive: true, force: true });
  writeFileSync(versionFile, `${version}\n`);
}

const version = pinnedVersion();
const cached = existsSync(executable) && existsSync(versionFile) && readFileSync(versionFile, "utf8").trim() === version;
if (!cached) unpack(version);

if (!existsSync(executable)) throw new Error(`${executable} is missing; unpacking failed`);
if (!existsSync(path.join(libDir(), "libnss3.so"))) throw new Error(`libnss3.so is missing under ${libDir()}`);

console.log(process.argv.includes("--lib-dir") ? libDir() : executable);
