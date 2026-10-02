/**
 * Lighthouse CI — the performance/CLS gate of §3.5.
 *
 * The measurement runs in `low-power` mode on purpose: that is the mode real users on weak
 * devices get, and it is the mode the prompt asks us to score. The `puppeteerScript` writes the
 * same localStorage flag the UI reads before every audited URL loads, and
 * `settings.disableStorageReset` stops Lighthouse from clearing it again before the run.
 *
 * `staticDistDir` is the staged copy rather than `dist` itself: it is the built artifact plus a
 * documented stand-in for the two read-only `/api/` calls the shell makes on load (see
 * `scripts/stage-lighthouse-dist.mjs`) — without it the browser logs a failed request that no page
 * script can suppress, and the `errors-in-console` gate would measure the missing backend.
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist-measure",
      url: ["/fa/", "/en/", "/fa/tools/", "/en/tools/", "/fa/biolab/", "/en/biolab/"],
      numberOfRuns: 2,
      puppeteerScript: "./scripts/lighthouse-low-power.cjs",
      // `settings.chromeFlags` is ignored when a puppeteerScript is used, so the flags live here.
      puppeteerLaunchOptions: {
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      },
      settings: {
        preset: "desktop",
        disableStorageReset: true,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "errors-in-console": ["error", { maxLength: 0 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./lhci-reports" },
  },
};
