import { test, expect } from "@playwright/test";

/**
 * تنها فایل تستی که در *هر دو* پروژهٔ Playwright («fa» و «en») اجرا می‌شود
 * (ر.ک. ``playwright.config.ts`` و ADR-0023) — چون baseURL هر پروژه خودش
 * پیشوند locale را دارد (``/`` یا ``/en/``)، در این فایل همیشه از مسیرهای
 * نسبیِ بدون اسلش ابتدایی استفاده می‌شود (``"services"`` نه ``"/services"``)
 * تا resolve صحیح نسبت به baseURL هر پروژه انجام شود. بقیهٔ فایل‌های e2e
 * فقط در پروژهٔ «fa» اجرا می‌شوند (مسیرهای مطلق + متن فارسی hardcoded).
 */

const expectations = {
  "fa-locale": { dir: "rtl", titlePattern: /امیت/, navLabel: "خدمات" },
  en: { dir: "ltr", titlePattern: /Emmett/, navLabel: "Services" },
} as const;

test("صفحهٔ اصلی با dir/عنوان/برچسب ناوبری صحیح برای locale پروژه بارگذاری می‌شود", async ({
  page,
}, testInfo) => {
  const locale = testInfo.project.name as keyof typeof expectations;
  const expected = expectations[locale];

  await page.goto("");

  await expect(page).toHaveTitle(expected.titlePattern);
  await expect(page.locator("html")).toHaveAttribute("dir", expected.dir);
  await expect(page.getByRole("link", { name: expected.navLabel })).toBeVisible();
});

test("ناوبری به صفحهٔ خدمات در هر دو locale کار می‌کند", async ({ page }, testInfo) => {
  const locale = testInfo.project.name as keyof typeof expectations;
  const expected = expectations[locale];

  await page.goto("services");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", expected.dir);
});
