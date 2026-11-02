import { describe, expect, it } from "vitest";

import { formatNumber, toLocaleDigits } from "./number";

describe("formatNumber", () => {
  it("در locale فارسی عدد را با ارقام فارسی نمایش می‌دهد", () => {
    const result = formatNumber(1234, "fa");
    expect(result).toBe("۱٬۲۳۴");
  });

  it("در locale انگلیسی عدد را با ارقام لاتین و جداکنندهٔ هزارگان نمایش می‌دهد", () => {
    const result = formatNumber(1234, "en");
    expect(result).toBe("1,234");
  });

  it("گزینه‌های Intl.NumberFormat (مثل style: currency) را پاس می‌دهد", () => {
    const result = formatNumber(99.5, "en", { style: "percent" });
    expect(result).toContain("%");
  });
});

describe("toLocaleDigits", () => {
  it("ارقام لاتین داخل یک رشته را به فارسی تبدیل می‌کند", () => {
    expect(toLocaleDigits("شمارهٔ سفارش: 12345", "fa")).toBe("شمارهٔ سفارش: ۱۲۳۴۵");
  });

  it("ارقام فارسی داخل یک رشته را به لاتین تبدیل می‌کند", () => {
    expect(toLocaleDigits("Order #۱۲۳۴۵", "en")).toBe("Order #12345");
  });

  it("رشتهٔ بدون رقم را بدون تغییر برمی‌گرداند", () => {
    expect(toLocaleDigits("بدون رقم", "fa")).toBe("بدون رقم");
    expect(toLocaleDigits("no digits", "en")).toBe("no digits");
  });
});
