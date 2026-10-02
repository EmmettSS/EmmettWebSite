/**
 * Pre-navigation hook for Lighthouse CI: every audited page is loaded with the site's
 * `low-power` device tier forced on (the same localStorage key `lib/device-tier.tsx` reads),
 * so the scores describe the experience weak devices actually get.
 */
module.exports = async (browser) => {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    try {
      window.localStorage.setItem("emmett:low-power", "true");
    } catch {
      /* storage disabled: the tier then falls back to hardware detection */
    }
  });
  return page;
};
