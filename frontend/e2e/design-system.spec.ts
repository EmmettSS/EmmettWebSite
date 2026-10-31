import { expect, test } from "@playwright/test";

/**
 * صفحهٔ سیستم طراحی باید توکن‌ها را **زنده** نشان دهد: مقدار هر توکن در زمان
 * اجرا از CSSOM خوانده می‌شود (ADR-0039)، نه از یک فهرست دستی.
 *
 * این اسپک دو چیز را اثبات می‌کند که هیچ تست واحدی نمی‌تواند، چون هر دو به
 * مرورگر واقعی نیاز دارند:
 *
 * ۱. نگاشت `@theme inline` واقعاً کار می‌کند: utility تولیدشده جعبه را به
 *    مقدار درستِ توکن رنگ می‌کند. اگر نگاشت حذف شود، جعبه بی‌رنگ می‌ماند و
 *    این تست می‌شکند — همان نقصی که باعث شد ده توکن پالت زمردی سال‌ها
 *    «تعریف‌شده ولی بی‌استفاده» بمانند و کد به هگز خام پناه ببرد.
 * ۲. `useSyncExternalStore` پس از hydration مقدار را پر می‌کند، پس برچسب
 *    «در انتظار hydration» روی صفحه نمی‌ماند.
 *
 * فقط در پروژهٔ `fa` اجرا می‌شود: در `playwright.config.ts` پروژه‌های
 * `fa-locale` و `en` با `testMatch` تنها `locale.spec.ts` را برمی‌دارند.
 */

/** مقدار محاسبه‌شدهٔ مرورگر برای شش توکن پالت؛ همه بدون آلفا پس قطعی‌اند. */
const PALETTE = [
  ["--emerald-deep", "rgb(11, 107, 72)"],
  ["--deep-green-black", "rgb(7, 19, 15)"],
  ["--blue-deep", "rgb(29, 111, 184)"],
  ["--teal-deep", "rgb(14, 122, 109)"],
  ["--amber-deep", "rgb(138, 90, 0)"],
  ["--violet-deep", "rgb(108, 75, 216)"],
] as const;

/** الگوی یک رنگ معتبر؛ مقدار خام یا rgb(). وابسته به locale نیست. */
const LIVE_COLOR = /^(#|rgb)/;

test.describe("صفحهٔ سیستم طراحی", () => {
  test("توکن‌های نگاشت‌شده واقعاً به مقدار درست رنگ می‌شوند", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    for (const [token, expected] of PALETTE) {
      const box = page.locator(`[data-token="${token}"] > div`).first();
      await expect(
        box,
        `${token} باید رنگ پس‌زمینهٔ خودِ توکن را بگیرد؛ بی‌رنگ ماندن یعنی نگاشت آن در @theme inline وجود ندارد`,
      ).toHaveCSS("background-color", expected);
    }
  });

  test("سه توکن متن ملایم سه مقدار متمایز می‌دهند", async ({ page }) => {
    await page.goto("/design-system");

    // نکتهٔ مهم (اصلاح ۲۰۲۶-۱۰-۳۱): نسخهٔ قبلی این تست مقدار رنگ را با یک
    // `evaluate` یک‌باره و **بدون retry** می‌خواند. در CI روی بیلد prerender
    // شده این خواندن گاهی پیش از اعمال شیوه‌نامه/هیدریت شدن انجام می‌شد و
    // رشتهٔ خالی یا رنگ ارثی برمی‌گشت (شکست تصادفی با پیام «Set size = 2»).
    // هر دو assertion حالا از APIهای retry‌دار Playwright استفاده می‌کنند:
    // `toHaveCSS` برای پایهٔ رنگ و `expect.poll` برای تمایز مقادیر.
    const colorLocator = (token: string) => page.locator(`[data-token="${token}"] span`).first();

    const onDark = colorLocator("--muted-on-dark");
    const onLight = colorLocator("--muted-on-light");
    const mutedForeground = colorLocator("--muted-foreground");

    // آلفای دقیق به سریال‌سازی مرورگر وابسته است، پس فقط پایهٔ رنگ asserted
    // می‌شود و تمایز با مقایسهٔ خودِ رشته‌ها سنجیده می‌شود.
    await expect(onDark).toHaveCSS("color", /^rgba\(243, 250, 246,/);
    await expect(onLight).toHaveCSS("color", /^rgba\(16, 42, 32,/);

    await expect
      .poll(
        async () =>
          new Set(
            await Promise.all(
              [onDark, onLight, mutedForeground].map((locator) =>
                locator.evaluate((element) => getComputedStyle(element).color),
              ),
            ),
          ).size,
        {
          message:
            "این سه توکن عمداً مقادیر متفاوت دارند (آلفای ۰٫۵۸، ۰٫۶۸ و ۰٫۵)؛ یکی‌شدنشان کنتراست متن را جابه‌جا می‌کند",
        },
      )
      .toBe(3);
  });

  test("مقدار زندهٔ همهٔ توکن‌ها پس از hydration از CSSOM پر می‌شود", async ({ page }) => {
    await page.goto("/design-system");

    // نخست با expect (که poll می‌کند) منتظر می‌مانیم تا store به‌روز شود؛
    // store در یک گذرِ رندر همهٔ توکن‌ها را با هم پر می‌کند.
    await expect(page.locator('[data-token="--emerald-deep"] span').last()).toHaveText(LIVE_COLOR);

    const values = await page.locator("[data-token] > span:last-child").allTextContents();
    expect(values.length).toBeGreaterThan(0);
    const notLive = values.map((value) => value.trim()).filter((value) => !LIVE_COLOR.test(value));
    expect(notLive, "این توکن‌ها مقدار زنده نگرفتند (خالی یا هنوز «در انتظار»)").toEqual([]);
  });
});
