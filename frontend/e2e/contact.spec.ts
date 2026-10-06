import { test, expect } from "@playwright/test";

test.describe("فرم تماس", () => {
  test("ارسال موفق فرم با دادهٔ معتبر پیام موفقیت نشان می‌دهد", async ({ page }) => {
    await page.goto("/contact");

    const uniqueEmail = `e2e-contact-${Date.now()}@example.com`;
    await page.getByLabel("نام").fill("کاربر تست");
    await page.getByLabel("ایمیل", { exact: true }).fill(uniqueEmail);
    await page.getByLabel("پیام").fill("این یک پیام تستی از Playwright است.");
    await page.getByLabel("موافقم که برای پیگیری درخواستم تماس گرفته شود.").check();

    await page.getByRole("button", { name: "ارسال پیام" }).click();

    await expect(page.getByText("متشکریم! پیام شما دریافت شد")).toBeVisible({ timeout: 10_000 });
  });

  test("فیلدهای الزامی بدون تکمیل نمی‌گذارند فرم ارسال شود", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "ارسال پیام" }).click();
    // مرورگر باید فیلد name را invalid علامت بزند (required native validation)
    const isValid = await page
      .getByLabel("نام")
      .evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(isValid).toBe(false);
  });

  test("فرم عضویت در خبرنامه کار می‌کند", async ({ page }) => {
    await page.goto("/contact");
    const uniqueEmail = `e2e-newsletter-${Date.now()}@example.com`;
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail);
    await page.getByRole("button", { name: "عضویت" }).click();
    await expect(page.getByText("عضویت شما با موفقیت ثبت شد!")).toBeVisible({ timeout: 10_000 });
  });
});
