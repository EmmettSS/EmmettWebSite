/**
 * Pre-navigation hook for Lighthouse CI: every audited page must load in the site's `low-power`
 * device tier, so the scores describe the experience weak devices actually get.
 *
 * The tier lives in localStorage (`emmett:low-power`, read by `web/src/lib/device-tier.tsx`), which
 * makes this a two-part job:
 *   · LHCI calls this hook once per audited URL, *before* the Lighthouse runs for it (see
 *     `isActive()` / `invokePuppeteerScriptForUrl()` in LHCI's puppeteer-manager), and
 *   · the flag has to be written by a page on the audited origin, inside the same browser profile
 *     Lighthouse then measures. Registering `evaluateOnNewDocument` without ever navigating would
 *     only arm a page nobody looks at, so the hook navigates, writes the flag and closes.
 *
 * Lighthouse clears storage before every run by default, which would undo the flag immediately;
 * `settings.disableStorageReset` in `lighthouserc.cjs` is what keeps it for the run.
 */
module.exports = async (browser, context) => {
  const page = await browser.newPage();
  try {
    await page.goto(context.url, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        window.localStorage.setItem("emmett:low-power", "true");
      } catch {
        /* storage disabled: the tier then falls back to hardware detection */
      }
    });
  } finally {
    await page.close();
  }
};
