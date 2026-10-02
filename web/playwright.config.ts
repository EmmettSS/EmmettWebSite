import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: './tests/e2e', timeout: 30_000, use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' }, webServer: { command: 'pnpm dev --host 0.0.0.0 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60_000 } })
