/**
 * Lighthouse CI — the performance/CLS gate of §3.5.
 *
 * The measurement runs in `low-power` mode on purpose: that is the mode real users on weak
 * devices get, and it is the mode the prompt asks us to score. `scripts/lighthouse-low-power.cjs`
 * sets the same localStorage flag the UI uses before every navigation.
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["/fa/", "/en/", "/fa/tools/", "/en/tools/", "/fa/biolab/", "/en/biolab/"],
      numberOfRuns: 2,
      puppeteerScript: "./scripts/lighthouse-low-power.cjs",
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
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
