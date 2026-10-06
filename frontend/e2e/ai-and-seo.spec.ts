import { expect, test } from "@playwright/test";

/**
 * تست‌های E2E برای قابلیت‌های فاز ۵ (مشاور ایده‌پرداز و تخمین‌گر پروژه) و
 * فاز ۷ (SEO، نقشهٔ سایت، robots.txt، فیدهای RSS و دادهٔ ساخت‌یافته JSON-LD).
 */

test.describe("مشاور ایده‌پرداز و تخمین‌گر هوشمند (فاز ۵)", () => {
  test("صفحهٔ مشاور ایده‌پرداز فقط با انتخاب‌های بسته (Enum) بارگذاری می‌شود و به تخمین‌گر لینک دارد", async ({
    page,
  }) => {
    await page.goto("/advisor");
    await expect(page.getByRole("heading", { level: 1, name: "مشاور ایده‌پرداز" })).toBeVisible();
    await expect(page.locator('input[type="text"], textarea')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "تخمین‌گر پروژه را ببینید" })).toHaveAttribute(
      "href",
      "/estimate",
    );
  });

  test("تخمین‌گر پروژه حداقل روز کاری را بدون قیمت عددی محاسبه و نمایش می‌دهد", async ({
    page,
  }) => {
    await page.goto("/estimate");
    await expect(page.getByRole("heading", { level: 1, name: "تخمین‌گر پروژه" })).toBeVisible();

    const firstGoal = page.locator('input[name="goals"]').first();
    await firstGoal.check();
    await page.getByRole("button", { name: "محاسبهٔ تخمین زمانی" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "برآورد اولیهٔ زمان" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/روز کاری/)).toBeVisible();
  });
});

test.describe("SEO، فیدهای RSS و دادهٔ ساخت‌یافته (فاز ۷)", () => {
  test("sitemap.xml و robots.txt معتبر هستند و مسیرهای خصوصی را افشا نمی‌کنند", async ({
    request,
  }) => {
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("<urlset");
    expect(sitemapXml).not.toContain("/profile");
    expect(sitemapXml).not.toContain("/advisor");

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain("Disallow: /admin");
    expect(robotsTxt).toContain("Sitemap:");
  });

  test("فیدهای RSS بلاگ و آکادمی با ساختار RSS 2.0 پاسخ می‌دهند", async ({ request }) => {
    const blogRss = await request.get("/blog/rss");
    expect(blogRss.status()).toBe(200);
    expect(await blogRss.text()).toContain("<rss");

    const academyRss = await request.get("/academy/rss");
    expect(academyRss.status()).toBe(200);
    expect(await academyRss.text()).toContain("<rss");
  });

  test("صفحهٔ اصلی دارای اسکریپت JSON-LD سازمان و وب‌سایت است", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    expect(jsonLd).toContain("Organization");
    expect(jsonLd).toContain("WebSite");
  });
});
