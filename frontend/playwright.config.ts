import { defineConfig, devices } from "@playwright/test";

/**
 * پیکربندی Playwright برای تست‌های E2E فاز ۴ (ر.ک. ADR-0023) و فاز ۸ پورت UI
 * (ر.ک. ADR-0037).
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
 *
 * فاز ۸ پورت (ADR-0037):
 * - خروجی تشخیصی CI: trace فقط هنگام شکست و screenshot فقط برای تستِ
 *   شکست‌خورده نگه داشته می‌شود تا آرتیفکت اجرا (Playwright report +
 *   ``test-results``) برای دیباگ کافی باشد، بدون هزینهٔ نگهداری همیشگی.
 *   ویدیو عمداً خاموش است؛ trace خودش تایم‌لاین و اسنپ‌شات دارد و روشن‌کردن
 *   ویدیو حجم آرتیفکت را چند برابر می‌کند.
 * - مسیر باینری Chromium از ``PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`` خوانده
 *   می‌شود تا محیط‌هایی که دانلود مرورگر Playwright در آن‌ها ممکن نیست
 *   (محدودیت شبکهٔ sandbox) بتوانند یک Chromium موجود را معرفی کنند؛ وقتی
 *   متغیر ست نباشد، رفتار استاندارد Playwright برقرار است (همان مسیری که
 *   CI با ``playwright install chromium`` استفاده می‌کند).
 * - ماتریس عرض‌های مرزی پروژهٔ جدا نمی‌خواهد: ``e2e/responsive.spec.ts``
 *   با ``page.setViewportSize`` هر ۸ عرض را در همان پروژهٔ ``fa`` می‌سنجد.
 */
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...(chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {}),
  },
  projects: [
    {
      name: "fa",
      // locale مرورگر باید fa باشد: next-intl بر اساس Accept-Language زبان
      // را تشخیص می‌دهد و بدون این گزینه (پیش‌فرض en-US مرورگر CI) همهٔ
      // مسیرهای بدون پیشوند به /en ریدایرکت می‌شوند و تست‌های فارسی خالی
      // برمی‌گردند. این همان قرارداد دو پروژهٔ ADR-0023 است که در کانفیگ
      // اولیه جا افتاده بود و فقط با اجرای واقعی CI دیده شد (ADR-0037).
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000", locale: "fa-IR" },
      testIgnore: /locale\.spec\.ts/,
    },
    {
      name: "fa-locale",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000", locale: "fa-IR" },
      testMatch: /locale\.spec\.ts/,
    },
    {
      name: "en",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000/en/", locale: "en-US" },
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
