import { describe, expect, it } from "vitest";

import { formatDate, formatToday } from "./date";

describe("formatDate", () => {
  it("تاریخ ISO را در locale فارسی به تقویم جلالی با ماه فارسی تبدیل می‌کند", () => {
    // ۲۰۲۴-۰۳-۲۰ میلادی برابر ۱ فروردین ۱۴۰۳ است.
    const result = formatDate("2024-03-20T00:00:00.000Z", "fa");
    expect(result).toContain("فروردین");
    expect(result).toContain("1403");
  });

  it("تاریخ ISO را در locale انگلیسی به تقویم میلادی با ماه انگلیسی تبدیل می‌کند", () => {
    const result = formatDate("2024-03-20T00:00:00.000Z", "en");
    expect(result).toContain("March");
    expect(result).toContain("2024");
  });

  it("وقتی withTime فعال است، ساعت را هم در خروجی می‌گنجاند", () => {
    const result = formatDate("2024-03-20T14:30:00.000Z", "en", { withTime: true });
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("ورودی نامعتبر را به رشتهٔ خالی تبدیل می‌کند (نه throw)", () => {
    expect(formatDate("not-a-real-date", "fa")).toBe("");
    expect(formatDate("not-a-real-date", "en")).toBe("");
  });
});

describe("formatToday", () => {
  it("بدون throw یک رشتهٔ غیرخالی برای هر دو locale برمی‌گرداند", () => {
    expect(formatToday("fa").length).toBeGreaterThan(0);
    expect(formatToday("en").length).toBeGreaterThan(0);
  });
});
