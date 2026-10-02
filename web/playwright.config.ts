import { defineConfig } from '@playwright/test'

/**
 * When Playwright's own `install chromium` is not usable (blocked CDN, offline machine), point
 * `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at a local build — `node scripts/local-browser.mjs` fetches
 * the same Chrome for Testing version CI uses and prints the path. Left unset, Playwright uses the
 * browser `playwright install --with-deps chromium` installed, which is what CI does.
 */
const localChrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: localChrome ? { executablePath: localChrome } : undefined,
  },
  webServer: {
    command: 'pnpm dev --host 0.0.0.0 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
