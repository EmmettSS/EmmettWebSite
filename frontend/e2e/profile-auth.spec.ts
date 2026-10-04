import { test, expect } from "@playwright/test";

/**
 * جریان ثبت‌نام → ورود خودکار → مشاهدهٔ پروفایل → خروج، به‌علاوهٔ تأثیر
 * وضعیت ورود روی دکمهٔ ثبت‌نام دورهٔ آکادمی (یکپارچه در یک تست برای حفظ
 * کوکی سشن بین مراحل، چون هر فایل تست Playwright یک browser context تازه
 * می‌گیرد).
 */
test.describe("ثبت‌نام، ورود و پروفایل", () => {
  test("کاربر جدید می‌تواند ثبت‌نام کند، وارد شود، در دوره ثبت‌نام کند و خارج شود", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-profile-${Date.now()}@example.com`;

    await page.goto("/profile");
    // دکمه‌های تب («ورود»/«ایجاد حساب») بیرون از <form> هستند، اما متن دکمهٔ
    // ارسال فرم هم همان برچسب را دارد؛ برای رفع ابهام، کلیک روی تب را به
    // ناحیهٔ بیرون از فرم محدود می‌کنیم.
    const tabBar = page.locator("div.flex.gap-2.border-b");
    await tabBar.getByRole("button", { name: "ایجاد حساب" }).click();

    const registerForm = page.locator("form");
    await registerForm.getByLabel("نام", { exact: true }).fill("کاربر");
    await registerForm.getByLabel("نام خانوادگی").fill("تست");
    await registerForm.getByLabel("ایمیل").fill(uniqueEmail);
    await registerForm.getByLabel("رمز عبور").fill("SuperSecret123!");
    await registerForm.getByRole("button", { name: "ایجاد حساب", exact: true }).click();

    await expect(page.getByText(/خوش آمدید/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("هنوز در دوره‌ای ثبت‌نام نکرده‌اید.")).toBeVisible();

    // حالا با سشن واردشده به صفحهٔ دوره برویم و ثبت‌نام کنیم.
    await page.goto("/academy/python-for-beginners");
    const enrollButton = page.getByRole("button", { name: "ثبت‌نام در این دوره" });
    await expect(enrollButton).toBeVisible({ timeout: 10_000 });
    await enrollButton.click();
    await expect(page.getByRole("button", { name: "شما در این دوره ثبت‌نام کرده‌اید" })).toBeVisible({
      timeout: 10_000,
    });

    // بازگشت به پروفایل باید دورهٔ تازه ثبت‌نام‌شده را نشان دهد.
    await page.goto("/profile");
    await expect(page.getByText("پایتون برای مبتدیان")).toBeVisible({ timeout: 10_000 });

    // با همین سشن واردشده، ثبت نظر زیر یک پست بلاگ باید ممکن باشد.
    await page.goto("/blog/intro-to-web-security");
    await page.getByPlaceholder("نظر خود را بنویسید…").fill("این یک نظر تستی از Playwright است.");
    await page.getByRole("button", { name: "ثبت نظر" }).click();
    await expect(page.getByText("نظر شما ثبت شد و در انتظار تأیید است.")).toBeVisible({
      timeout: 10_000,
    });

    // خروج.
    await page.getByRole("button", { name: "خروج" }).click();
    await expect(page.getByText(/خوش آمدید/)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByLabel("رمز عبور")).toBeVisible();
  });
});
