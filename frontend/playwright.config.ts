import { defineConfig, devices } from "@playwright/test";

/**
 * پیکربندی Playwright برای تست‌های E2E فاز ۴ (ر.ک. ADR-0023).
 *
 * دو پروژه برای پوشش صریح RTL/LTR:
 * - ``fa``: baseURL فارسی (بدون پیشوند)، اکثر تست‌ها (مسیرهای مطلق + متن
 *   فارسی hardcoded) فقط اینجا اجرا می‌شوند.
 * - ``en``: baseURL با پیشوند ``/en``، فقط ``locale.spec.ts`` (نوشته‌شده با
 *   مسیرهای نسبیِ بدون اسلش ابتدایی تا نسبت به baseURL هر پروژه resolve شود).
 *
 * طبق ADR-0023، E2E باید در برابر یک build واقعی اجرا شود (نه ``next dev``).
 * CSP nonce در ``src/proxy.ts`` رندر صفحات را به SSR پویا می‌برد؛ بک‌اند
 * Django باید پیش از اجرای تست بالا و seed شده باشد، اما لازم نیست هنگام
 * ``next build`` در دسترس باشد (جزئیات در ``e2e/README.md``).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  projects: [
    {
      name: "fa",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000" },
      testIgnore: /locale\.spec\.ts/,
    },
    {
      name: "fa-locale",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000" },
      testMatch: /locale\.spec\.ts/,
    },
    {
      name: "en",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000/en/" },
      testMatch: /locale\.spec\.ts/,
    },
  ],
  webServer: {
    // build واقعی طبق ADR-0023؛ داده‌های backend با SSR هنگام اجرای تست خوانده می‌شوند.
    command: "npm run build && npm run start -- -p 3000 -H 0.0.0.0",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
