import { test, expect } from "@playwright/test";

test.describe("جستجوی سراسری", () => {
  test("تایپ در فرم جستجو نتایج واقعی از FTS بک‌اند برمی‌گرداند", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByText("برای جستجو در کل سایت تایپ کنید.")).toBeVisible();

    await page.getByPlaceholder("جستجو در خدمات، پروژه‌ها، دوره‌ها، مقالات…").fill("Django");
    await page.getByRole("button", { name: "جستجو" }).click();

    await expect(page).toHaveURL(/\/search\?q=Django/);
    await expect(page.getByText(/نتیجه برای.*Django/)).toBeVisible();

    const firstResult = page.locator("ul li a").first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();
    // باید به یکی از مسیرهای واقعی محتوا (نه /search) هدایت شود.
    await expect(page).not.toHaveURL(/\/search/);
  });

  test("جستجوی بی‌نتیجه پیام خالی را نشان می‌دهد", async ({ page }) => {
    await page.goto("/search?q=zzznonexistentqueryzzz");
    await expect(page.getByText("نتیجه‌ای یافت نشد.")).toBeVisible();
  });
});
