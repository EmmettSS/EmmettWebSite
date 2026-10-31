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
    await page.getByRole("button", { name: "محاسبهٔ زمان اولیه" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "برآورد اولیهٔ زمان" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/حداقل زمان خوش‌بینانه: .*روز کاری/)).toBeVisible();
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

test.describe("canonical محصولات (ADR-0040)", () => {
  /**
   * `pentestor` تنها محصولِ دادهٔ سید است (`seed_demo_data` با
   * `is_product=True`)، همان الگویی که بقیهٔ اسپک‌ها برای دادهٔ سید دارند.
   *
   * باگی که این تست قفل می‌کند: صفحهٔ واقعی و پرمحتوای `/projects/pentestor`
   * قبلاً canonical، `og:url`، hreflang و JSON-LD خودش را به
   * `/products/pentestor` می‌داد — که صفحهٔ «به‌زودی»ِ پورت UI است و هیچ
   * محتوایی ندارد. یعنی به موتور جست‌وجو گفته می‌شد نسخهٔ مرجع، صفحهٔ خالی
   * است؛ هم‌زمان sitemap خودِ `/projects/pentestor` را می‌فرستاد و این دو
   * سیگنال با هم در تناقض بودند.
   */
  test("صفحهٔ جزئیات محصول به خودش اشاره می‌کند، نه به صفحهٔ «به‌زودی»", async ({
    page,
    request,
  }) => {
    await page.goto("/projects/pentestor");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/projects\/pentestor$/,
    );
    // هر سه از یک `path` در `buildPageMetadata` ساخته می‌شوند، پس باید هم‌راستا باشند.
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      /\/projects\/pentestor$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/projects\/pentestor$/,
    );

    // نانبردِ JSON-LD: والد، فهرست محصولات است؛ خودِ آیتم، URL واقعی صفحه.
    // توجه: `filter({ hasText })` روی تگ `<script>` جواب نمی‌دهد چون محتوای
    // script «متن رندرشده» نیست (در CI با timeout 30s شکست). الگوی درست همان
    // است که تست JSON-LD صفحهٔ اصلی در همین فایل به کار می‌برد: خواندن
    // `textContent` و assert روی رشته.
    const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const breadcrumbJson = jsonLdBlocks.find((block) => block.includes("BreadcrumbList")) ?? "";
    expect(breadcrumbJson, "بلوک JSON-LD نانبرد پیدا نشد").toContain("BreadcrumbList");
    expect(breadcrumbJson).toContain("/projects/pentestor");
    expect(breadcrumbJson).not.toContain("/products/pentestor");

    // تناقض canonical/sitemap باید بسته بماند.
    const sitemapXml = await (await request.get("/sitemap.xml")).text();
    expect(sitemapXml).toContain("/projects/pentestor");
    expect(sitemapXml).not.toContain("/products/pentestor");
  });

  test("یک پروژهٔ غیرمحصول هم canonical خودش را دارد", async ({ page }) => {
    await page.goto("/projects/fintech-dashboard");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/projects\/fintech-dashboard$/,
    );
  });

  test("فهرست محصولات به صفحهٔ واقعی /projects/{slug} لینک می‌دهد", async ({ page }) => {
    // همین لینک‌ها دلیل اصلی تصمیم ADR-0040 بودند: اگر فهرست محصولات به
    // `/products/{slug}` لینک می‌داد، آن مسیر می‌توانست مرجع باشد. نمی‌دهد.
    await page.goto("/products");
    await expect(page.getByRole("heading", { level: 1, name: "محصولات" })).toBeVisible();

    const firstCard = page
      .locator("a[href]")
      .filter({ hasText: /Pentestor/ })
      .first();
    await expect(firstCard).toHaveAttribute("href", /^\/projects\/[a-z0-9-]+$/);
  });

  test("صفحهٔ «به‌زودی»ِ CRM دست‌نخورده می‌ماند و /projects/crm همچنان ۴۰۴ است", async ({
    page,
  }) => {
    // قرارداد ADR-0037: CRM هیچ متناظر دیتابیسی ندارد، پس صفحهٔ «به‌زودی» با
    // canonical خودش باقی می‌ماند. `/products/pentestor` از ADR-0040 بند ۷
    // ریدایرکت دائمی دارد و در `ui-port.spec.ts` سنجیده می‌شود.
    await page.goto("/products/crm");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/products\/crm$/);

    // CRM در دیتابیس نیست، پس مسیر جزئیات پروژه‌ها باید ۴۰۴ بدهد و هیچ لینکی
    // هم در سایت به آن وجود ندارد (بررسی شد).
    const response = await page.goto("/projects/crm");
    expect(response?.status()).toBe(404);
  });
});
