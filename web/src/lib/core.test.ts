import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatJalali, toJalali } from "./jalali";

describe("Jalali utilities", () => {
  it("formats a Gregorian instant using the Persian calendar and Tehran timezone", () => {
    expect(formatJalali(new Date("2024-03-20T12:00:00Z"))).toContain("۱۴۰۳");
    expect(toJalali(new Date("2024-03-20T12:00:00Z")).year).toBe(1403);
  });
  it("does Gregorian-day arithmetic across month boundaries", () => {
    expect(daysBetween(new Date(2025, 0, 31), new Date(2025, 1, 2))).toBe(2);
    expect(addDays(new Date(2025, 0, 31), 1).getDate()).toBe(1);
  });
});
