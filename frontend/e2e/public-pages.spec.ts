import { test, expect } from "@playwright/test";

/**
 * مسیرهای عمومی اصلی — صرفاً بارگذاری موفق صفحه، عنوان صحیح و لینک‌دهی به
 * جزئیات را بررسی می‌کند. فرض: بک‌اند با ``python manage.py seed_demo_data``
 * seed شده است (ر.ک. ``backend/apps/core/management/commands/seed_demo_data.py``).
 */

test.describe("صفحهٔ اصلی و ناوبری", () => {
  // بررسی دوزبانهٔ dir/title در ``e2e/locale.spec.ts`` انجام می‌شود (یک فایل
  // مجزا که در هر دو پروژهٔ Playwright «fa» و «en» اجرا می‌شود؛ ر.ک. ADR-0023).

  test("هدر سایت لینک کتابخانه را به /blog می‌فرستد نه /library", async ({ page }) => {
    await page.goto("/");
    const libraryLink = page.getByRole("link", { name: "کتابخانه" });
    await expect(libraryLink).toHaveAttribute("href", "/blog");
  });

  test("مسیر ناموجود صفحهٔ ۴۰۴ سفارشی نمایش می‌دهد", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("صفحه پیدا نشد")).toBeVisible();
  });
});

test.describe("خدمات", () => {
  test("فهرست خدمات حداقل یک کارت نمایش می‌دهد و به جزئیات لینک می‌دهد", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1, name: "خدمات" })).toBeVisible();

    const firstCard = page.locator('a[href^="/services/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL(/\/services\/[a-z0-9-]+$/);
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("پروژه‌ها و محصولات", () => {
  test("فهرست پروژه‌ها به صفحهٔ جزئیات شامل Case Study لینک می‌دهد", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1, name: "پروژه‌ها" })).toBeVisible();

    const firstCard = page.locator('a[href^="/projects/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("صفحهٔ محصولات فقط پروژه‌های is_product را نشان می‌دهد", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { level: 1, name: "محصولات" })).toBeVisible();
  });
});

test.describe("آکادمی", () => {
  test("فهرست دوره‌ها به صفحهٔ جزئیات دوره لینک می‌دهد و سرفصل نمایش داده می‌شود", async ({
    page,
  }) => {
    await page.goto("/academy");
    await expect(page.getByRole("heading", { level: 1, name: "آکادمی" })).toBeVisible();

    const firstCard = page.locator('a[href^="/academy/"]').first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/academy\/[a-z0-9-]+$/);
    await expect(page.getByText("سرفصل")).toBeVisible();
  });

  test("کاربر مهمان دکمهٔ «برای ثبت‌نام وارد شوید» را می‌بیند", async ({ page }) => {
    await page.goto("/academy/python-for-beginners");
    await expect(page.getByRole("link", { name: "برای ثبت‌نام وارد شوید" })).toBeVisible();
  });
});

test.describe("کتابخانه (بلاگ)", () => {
  test("فهرست مقالات به صفحهٔ جزئیات مقاله شامل فهرست مطالب لینک می‌دهد", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1, name: "کتابخانه" })).toBeVisible();

    const firstCard = page.locator('a[href^="/blog/"]').first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("کاربر مهمان پیام «برای ثبت نظر وارد شوید» را می‌بیند", async ({ page }) => {
    await page.goto("/blog/intro-to-web-security");
    await expect(page.getByText("برای ثبت نظر وارد شوید")).toBeVisible();
  });
});

test.describe("دربارهٔ ما", () => {
  test("تیم و نظرات مشتریان نمایش داده می‌شود", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "دربارهٔ ما" })).toBeVisible();
    await expect(page.getByText("تیم", { exact: true })).toBeVisible();
  });
});
