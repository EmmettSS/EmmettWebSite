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
 * طبق ADR-0023، E2E باید در برابر یک build واقعی اجرا شود (نه ``next dev``)
 * چون صفحات فهرست (``/services``, ``/projects``, ``/academy``, ``/blog``,
 * ``/about``) با ISR (``revalidate: 60``) در زمان build پیش‌رندر می‌شوند؛
 * بک‌اند Django باید **پیش از** اجرای ``next build`` در دسترس و seed شده
 * باشد وگرنه این صفحات با دادهٔ خالی baked خواهند شد (جزئیات در
 * ``e2e/README.md``).
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
    // ``build`` قبل از ``start`` تضمین می‌کند صفحات ISR با دادهٔ واقعی
    // بک‌اند (که باید از قبل در حال اجرا و seed‌شده باشد) prerender شوند.
    command: "npm run build && npm run start -- -p 3000 -H 0.0.0.0",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
