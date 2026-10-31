import { expect, test, type Page } from "@playwright/test";

/**
 * بازبینی زندهٔ عرض‌های مرزی (فاز ۸ پورت — ADR-0037).
 *
 * بازبینی استاتیک فاز ۲ روی کلاس‌ها انجام شده بود، اما تأیید پیکسلی روی
 * پیش‌نمایش زنده باز مانده بود. این فایل همان ۸ عرض توافق‌شده
 * (۳۲۰/۳۹۰/۶۴۰/۷۶۸/۱۰۲۴/۱۲۸۰/۱۴۴۰/۱۹۲۰) را در مرورگر واقعی می‌سنجد:
 * شش عرض اول دقیقاً بریک‌پوینت‌های مقیاس Tailwind/UI در ``globals.css``
 * هستند، ۱۴۴۰ سقف ظرف صفحات (``max-w-[1440px]``) و ۱۹۲۰ بزرگ‌ترین
 * ``deviceSize`` در ``next.config.ts``.
 *
 * معیار پذیرش هر عرض (خانه + یک صفحهٔ داخلی):
 * ۱) هیچ اسکرول افقی در سطح سند نیست؛
 * ۲) حالت ناوبری درست است — زیر ``lg`` همبرگر و از ``lg`` به بالا ناوبری
 *    دسکتاپ (قرارداد ``navbar.tsx`` پورت)؛
 * ۳) تیتر اصلی دیده می‌شود و متنش نه بریده می‌شود نه از کادرش بیرون
 *    می‌زند (``scrollWidth`` تیتر از پهنای مرئی‌اش بزرگ‌تر نیست و جعبه‌اش
 *    داخل viewport می‌ماند) — برای فارسی و انگلیسی این همان «نچسبیدن/
 *    نبریدن» متن است، چون شکست خط و جهت از خود سند می‌آید.
 *
 * اسکرین‌شات تمام‌صفحهٔ خانه و نمای داخلی در هر عرض به گزارش Playwright
 * پیوست می‌شود تا بازبینی چشمی از آرتیفکت همان اجرای CI ممکن باشد.
 */

const WIDTHS = [320, 390, 640, 768, 1024, 1280, 1440, 1920] as const;

function heightFor(width: number) {
  return width <= 390 ? 844 : 900;
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `اسکرول افقی در عرض ${width}: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function waitForLoader(page: Page) {
  await expect(page.locator(".ui-loader")).toBeHidden({ timeout: 15_000 });
}

/** متن تیتر نباید بریده یا از جعبه‌اش بیرون زده باشد و جعبه باید داخل نما بماند. */
async function expectTextFits(page: Page, width: number) {
  const heading = page.locator("h1");
  const metrics = await heading.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(
    metrics.scrollWidth,
    `متن تیتر در عرض ${width} بریده شده: scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);

  const box = await heading.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
}

test.describe("عرض‌های مرزی — خانه", () => {
  for (const width of WIDTHS) {
    test(`خانه در عرض ${width} بدون سرریز و با ناوبری درست رندر می‌شود`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: heightFor(width) });
      await page.goto("/");
      await waitForLoader(page);

      await expect(page.locator("h1")).toContainText("هوشمند.");
      await expectTextFits(page, width);
      await expectNoHorizontalOverflow(page, width);

      const nav = page.getByRole("navigation", { name: "ناوبری اصلی" });
      const hamburger = page.getByRole("button", { name: "باز کردن منو" });
      if (width < 1024) {
        await expect(hamburger).toBeVisible();
        await expect(nav.getByRole("link", { name: "خدمات" })).toBeHidden();
      } else {
        await expect(hamburger).toBeHidden();
        await expect(nav.getByRole("link", { name: "خدمات" })).toBeVisible();
      }

      await testInfo.attach(`home-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
      // اسکرولِ اسکرین‌شات تمام‌صفحه نباید معیار سرریز را به‌هم بزند.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expectNoHorizontalOverflow(page, width);
    });
  }
});

test.describe("عرض‌های مرزی — صفحهٔ داخلی (خدمات)", () => {
  for (const width of WIDTHS) {
    test(`خدمات در عرض ${width} بدون سرریز رندر می‌شود`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: heightFor(width) });
      await page.goto("/services");
      await waitForLoader(page);

      await expect(page.getByRole("heading", { level: 1, name: "خدمات" })).toBeVisible();
      await expectTextFits(page, width);
      await expectNoHorizontalOverflow(page, width);

      await testInfo.attach(`services-${width}`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });
  }
});
