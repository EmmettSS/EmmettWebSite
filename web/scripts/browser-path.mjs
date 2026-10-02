/**
 * Prints the Chrome path of the browser `playwright install chromium` put on this machine.
 *
 * The Lighthouse job needs an explicit path: LHCI does not download a browser, it only launches one
 * it can find, and the runner's preinstalled Chrome is not part of a Puppeteer cache. Pointing it
 * at the browser this repo already installs for Playwright keeps both gates on one engine.
 *
 * Used by `.github/workflows/ci.yml`:
 *   echo "CHROME_PATH=$(node web/scripts/browser-path.mjs)" >> "$GITHUB_ENV"
 */
import { createRequire } from "node:module";

const require_ = createRequire(new URL("../scripts/", import.meta.url));

const { chromium } = require_("@playwright/test");
const executablePath = chromium.executablePath();
if (!executablePath) {
  // Non-zero exit fails the step, which is the point: measuring nothing must not look like a pass.
  console.error("playwright has no chromium executable path — run `playwright install chromium` first");
  process.exit(1);
}
console.log(executablePath);
