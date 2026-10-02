import { describe, expect, it } from "vitest";
import {
  BULK_MAX_LINES,
  NOROOZ,
  YALDA,
  addWorkingDays,
  bulkToCsv,
  convertBulk,
  convertGregorian,
  convertJalali,
  diffDates,
  distanceToAnnual,
  isWeekend,
  monthLabel,
  nthWeekdayOfMonth,
  jalaliToday,
} from "./logic";
import { gregorianToJalali, isJalaliLeapYear, jalaliMonthLength, jalaliWeekday, toLatinDigits } from "@/lib/jalali";

/** Card test 1 — last day of a leap year, in both directions. */
describe("F-01 acceptance: conversion", () => {
  it("converts 1403/12/30 to 2025-03-20 and back", () => {
    const forward = convertJalali("1403/12/30");
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    expect(forward.gregorian).toEqual({ year: 2025, month: 3, day: 20 });
    expect(forward.leapYear).toBe(true);
    const backward = convertGregorian("2025-03-20");
    expect(backward.ok).toBe(true);
    if (!backward.ok) return;
    expect(backward.jalali).toEqual({ year: 1403, month: 12, day: 30 });
    expect(backward.weekdayFa).toBe("پنج‌شنبه");
  });

  it("accepts Persian, Arabic and Latin digits with any separator", () => {
    for (const input of ["۱۴۰۴/۰۷/۰۱", "١٤٠٤/٠٧/٠١", "1404.07.01", "1404-7-1"]) {
      const result = convertJalali(input);
      expect(result.ok, input).toBe(true);
    }
  });

  it("derives leap years arithmetically (no hard-coded table)", () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(isJalaliLeapYear(1408)).toBe(true);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
  });

  it("agrees with the platform Persian calendar over the supported range", () => {
    const format = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
    for (let index = 0; index < 400; index += 1) {
      const year = 1300 + Math.floor((index * 199) % 200);
      const month = 1 + ((index * 7) % 12);
      const day = 1 + ((index * 11) % jalaliMonthLength(year, month));
      const result = convertJalali(`${year}/${month}/${day}`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const parts = format.formatToParts(new Date(Date.UTC(result.gregorian.year, result.gregorian.month - 1, result.gregorian.day)));
      const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
      expect([value("year"), value("month"), value("day")], `${year}/${month}/${day}`).toEqual([year, month, day]);
    }
  });

  it("reports invalid and out-of-range input with a Persian message, never a raw error", () => {
    const invalid = convertJalali("1404/13/01");
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error).toBe("invalid");
    expect(invalid.messageFa).toContain("معتبر نیست");
    const range = convertJalali("1199/01/01");
    expect(range.ok).toBe(false);
    if (range.ok) return;
    expect(range.error).toBe("out-of-range");
    expect(range.messageFa).toContain("۱۲۰۰");
  });
});

/** Card test 2 — 15 business days after 1404/01/01 with the 1404 holiday calendar. */
describe("F-01 acceptance: working days", () => {
  const holidays1404 = {
    "1404/01/01": "نوروز",
    "1404/01/02": "نوروز",
    "1404/01/03": "نوروز",
    "1404/01/04": "نوروز",
    "1404/01/12": "روز جمهوری اسلامی",
    "1404/01/13": "سیزده‌بدر",
  };

  it("counts 15 business days after Nowruz 1404 including holidays", () => {
    const plan = addWorkingDays({ year: 1404, month: 1, day: 1 }, 15, holidays1404);
    expect(plan.result).toEqual({ year: 1404, month: 1, day: 24 });
    expect(plan.skippedHolidays).toBe(5);
    expect(plan.skippedWeekends).toBe(3);
    expect(plan.holidayLabels.length).toBe(plan.skippedHolidays);
  });

  it("skips Fridays and never counts the anchor day", () => {
    expect(isWeekend({ year: 1404, month: 1, day: 1 })).toBe(true); // 2025-03-21 was a Friday
    const plan = addWorkingDays({ year: 1404, month: 1, day: 2 }, 1, {});
    expect(plan.result).toEqual({ year: 1404, month: 1, day: 3 });
  });

  it("guards the 400 business-day ceiling with a Persian message", () => {
    expect(() => addWorkingDays({ year: 1404, month: 1, day: 1 }, 500)).toThrow(/۴۰۰/);
  });

  it("computes diffs, nth weekdays and annual distances", () => {
    const diff = diffDates({ year: 1404, month: 1, day: 1 }, { year: 1404, month: 8, day: 15 });
    expect(diff.days).toBe(230);
    expect(diff.breakdown).toEqual({ years: 0, months: 7, days: 14 });
    expect(nthWeekdayOfMonth(1404, 1, 6, 1)).toEqual({ year: 1404, month: 1, day: 1 });
    expect(nthWeekdayOfMonth(1404, 1, 0, 2)).toEqual({ year: 1404, month: 1, day: 9 });
    expect(distanceToAnnual({ year: 1404, month: 12, day: 25 }, NOROOZ).days).toBe(5);
    expect(distanceToAnnual({ year: 1404, month: 6, day: 28 }, YALDA).days).toBe(93);
    expect(monthLabel(10)).toBe("دی");
  });
});

/** Card test 3 — 1000-line bulk conversion, and card test 5 — URL state round-trip. */
describe("F-01 acceptance: bulk and state", () => {
  it("converts 1000 lines quickly and caps the input", () => {
    const lines = Array.from({ length: BULK_MAX_LINES + 50 }, (_, index) => `1404/01/${String((index % 28) + 1).padStart(2, "0")}`);
    const started = performance.now();
    const result = convertBulk(lines.join("\n"), "jalali-to-gregorian");
    expect(performance.now() - started).toBeLessThan(2000);
    expect(result.rows.length).toBe(BULK_MAX_LINES);
    expect(result.truncated).toBe(true);
    expect(result.okCount).toBe(BULK_MAX_LINES);
    expect(bulkToCsv(result).split("\n")[0]).toBe("input,jalali,gregorian,weekday");
  });

  it("keeps the same result offline (pure logic, no network)", () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network is not allowed in tool logic");
    }) as typeof fetch;
    try {
      expect(convertJalali("1404/07/01").ok).toBe(true);
      expect(addWorkingDays({ year: 1404, month: 1, day: 1 }, 3).result.day).toBe(4);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("normalises Persian digits for URL state values", () => {
    expect(toLatinDigits("۱۴۰۴/۰۷/۰۱")).toBe("1404/07/01");
    expect(jalaliWeekday({ year: 1404, month: 1, day: 1 })).toBe(6);
    expect(jalaliToday(new Date("2025-03-21T09:00:00Z")).year).toBe(1404);
    expect(gregorianToJalali({ year: 2026, month: 10, day: 2 })).toEqual({ year: 1405, month: 7, day: 10 });
  });
});
