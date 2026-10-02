/**
 * F-01 — Jalali date toolbox logic.
 * Pure, DOM-free: the same functions run in the browser, inside the Static Bridge
 * prerender step and in unit tests. No third-party date library is involved.
 */
import {
  JALALI_MONTHS_FA,
  MAX_JALALI_YEAR,
  MIN_JALALI_YEAR,
  WEEKDAYS_FA,
  dayNumberToJalali,
  formatJalaliLong,
  formatJalaliNumeric,
  gregorianToJalali,
  isJalaliLeapYear,
  isJalaliValid,
  jalaliMonthLength,
  jalaliToGregorian,
  jalaliWeekday,
  parseGregorianInput,
  parseJalaliInput,
  toLatinDigits,
  toPersianDigits,
  type GregorianDate,
  type JalaliDate,
} from "@/lib/jalali";

export type HolidayMap = Record<string, string>; // "1404-01-01" → "نوروز"

export type ConversionResult =
  | {
      ok: true;
      jalali: JalaliDate;
      gregorian: GregorianDate;
      weekdayFa: string;
      longFa: string;
      dayOfYear: number;
      leapYear: boolean;
      iso: string;
    }
  | { ok: false; error: "invalid" | "out-of-range"; messageFa: string; messageEn: string };

const MESSAGES = {
  invalid: {
    fa: "تاریخ وارد‌شده معتبر نیست. نمونهٔ درست: ۱۴۰۴/۰۷/۰۱",
    en: "That is not a valid date. Example: 1404/07/01",
  },
  range: {
    fa: `بازهٔ پشتیبانی‌شده سال ${toPersianDigits(MIN_JALALI_YEAR)} تا ${toPersianDigits(MAX_JALALI_YEAR)} است.`,
    en: `Supported range is ${MIN_JALALI_YEAR} to ${MAX_JALALI_YEAR}.`,
  },
};

export function isOutOfRange(year: number): boolean {
  return year < MIN_JALALI_YEAR || year > MAX_JALALI_YEAR;
}

function fail(error: "invalid" | "out-of-range"): ConversionResult {
  const message = error === "out-of-range" ? MESSAGES.range : MESSAGES.invalid;
  return { ok: false, error, messageFa: message.fa, messageEn: message.en };
}

/** Day index (days since 1970-01-01) for a Jalali date — the single source of arithmetic. */
export function jalaliDayIndex(date: JalaliDate): number {
  return dayIndexFromGregorian(jalaliToGregorian(date));
}

export function dayIndexFromGregorian(date: GregorianDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

export function formatGregorian(date: GregorianDate, persianDigits = false): string {
  const text = `${date.year}/${String(date.month).padStart(2, "0")}/${String(date.day).padStart(2, "0")}`;
  return persianDigits ? toPersianDigits(text) : text;
}

export function buildConversion(jalali: JalaliDate): ConversionResult {
  if (!isJalaliValid(jalali)) return fail(isOutOfRange(jalali.year) ? "out-of-range" : "invalid");
  const gregorian = jalaliToGregorian(jalali);
  const dayOfYear = jalaliDayIndex(jalali) - jalaliDayIndex({ year: jalali.year, month: 1, day: 1 }) + 1;
  return {
    ok: true,
    jalali,
    gregorian,
    weekdayFa: WEEKDAYS_FA[jalaliWeekday(jalali)],
    longFa: formatJalaliLong(jalali, "fa"),
    dayOfYear,
    leapYear: isJalaliLeapYear(jalali.year),
    iso: `${gregorian.year}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`,
  };
}

export function convertJalali(input: string): ConversionResult {
  const parsed = parseJalaliInput(input);
  if (parsed) return buildConversion(parsed);
  const year = Number(toLatinDigits(input.trim()).replace(/[.\-–—]/g, "/").split("/")[0]);
  return fail(Number.isFinite(year) && isOutOfRange(year) ? "out-of-range" : "invalid");
}

export function convertGregorian(input: string): ConversionResult {
  const parsed = parseGregorianInput(input);
  if (!parsed) return fail("invalid");
  const jalali = gregorianToJalali(parsed);
  if (isOutOfRange(jalali.year)) return fail("out-of-range");
  return buildConversion(jalali);
}

/* ------------------------------------------------------------------ *
 * Calculations tab
 * ------------------------------------------------------------------ */

export type DateDiff = {
  days: number;
  months: number;
  years: number;
  breakdown: { years: number; months: number; days: number };
  weeks: number;
  remainderDays: number;
  workingDaysExclusive: number;
  weekendDays: number;
  holidays: { date: string; label: string }[];
};

export function diffDates(a: JalaliDate, b: JalaliDate, holidays: HolidayMap = {}): DateDiff {
  const fromIndex = jalaliDayIndex(a);
  const toIndex = jalaliDayIndex(b);
  const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  const days = end - start;
  const months = Math.abs((b.year - a.year) * 12 + (b.month - a.month));
  const breakdown = calendarBreakdown(fromIndex <= toIndex ? a : b, fromIndex <= toIndex ? b : a);
  let weekendDays = 0;
  let working = 0;
  const holidayHits: { date: string; label: string }[] = [];
  for (let index = 0; index <= days; index += 1) {
    const cursor = dayNumberToJalali(start + index);
    const weekend = isWeekend(cursor);
    if (weekend) weekendDays += 1;
    const label = holidays[holidayKey(cursor)];
    if (label && !weekend) holidayHits.push({ date: holidayKey(cursor), label });
    if (!weekend && !label) working += 1;
  }
  return {
    days,
    months,
    years: Math.trunc(months / 12),
    breakdown,
    weeks: Math.trunc(days / 7),
    remainderDays: days % 7,
    // The anchor day itself is not a working interval, so one is deducted.
    workingDaysExclusive: Math.max(0, working - 1),
    weekendDays,
    holidays: holidayHits,
  };
}

function calendarBreakdown(from: JalaliDate, to: JalaliDate): { years: number; months: number; days: number } {
  let years = to.year - from.year;
  let months = to.month - from.month;
  let days = to.day - from.day;
  if (days < 0) {
    months -= 1;
    const previousMonth = to.month === 1 ? 12 : to.month - 1;
    const previousYear = to.month === 1 ? to.year - 1 : to.year;
    days += jalaliMonthLength(previousYear, previousMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export function isWeekend(date: JalaliDate): boolean {
  return jalaliWeekday(date) === 6; // جمعه
}

export function holidayKey(date: JalaliDate): string {
  return formatJalaliNumeric(date);
}

export function isHoliday(date: JalaliDate, holidays: HolidayMap): boolean {
  return Boolean(holidays[holidayKey(date)]);
}

export function addDaysToJalali(date: JalaliDate, days: number): JalaliDate {
  const result = dayNumberToJalali(jalaliDayIndex(date) + days);
  if (isOutOfRange(result.year)) throw new Error(MESSAGES.range.fa);
  return result;
}

export type WorkdayPlan = {
  from: JalaliDate;
  addBusinessDays: number;
  result: JalaliDate;
  resultLongFa: string;
  skippedWeekends: number;
  skippedHolidays: number;
  holidayLabels: string[];
};

/** Adds business days, skipping Fridays and every holiday of the versioned calendar. */
export function addWorkingDays(from: JalaliDate, add: number, holidays: HolidayMap = {}): WorkdayPlan {
  if (!Number.isInteger(add) || add < 0) throw new Error("تعداد روز کاری باید عددی صحیح و نامنفی باشد.");
  if (add > 400) throw new Error("حداکثر ۴۰۰ روز کاری در هر محاسبه پشتیبانی می‌شود.");
  let cursor = from;
  let remaining = add;
  let skippedWeekends = 0;
  let skippedHolidays = 0;
  const holidayLabels: string[] = [];
  while (remaining > 0) {
    cursor = addDaysToJalali(cursor, 1);
    if (isWeekend(cursor)) {
      skippedWeekends += 1;
      continue;
    }
    const label = holidays[holidayKey(cursor)];
    if (label) {
      skippedHolidays += 1;
      holidayLabels.push(`${holidayKey(cursor)} — ${label}`);
      continue;
    }
    remaining -= 1;
  }
  return {
    from,
    addBusinessDays: add,
    result: cursor,
    resultLongFa: formatJalaliLong(cursor, "fa"),
    skippedWeekends,
    skippedHolidays,
    holidayLabels,
  };
}

export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): JalaliDate | null {
  if (nth < 1 || nth > 5) return null;
  let seen = 0;
  for (let day = 1; day <= jalaliMonthLength(year, month); day += 1) {
    const candidate = { year, month, day };
    if (jalaliWeekday(candidate) === weekday) {
      seen += 1;
      if (seen === nth) return candidate;
    }
  }
  return null;
}

export type AnnualDistance = { days: number; target: JalaliDate; label: string; formatted: string };

/** Days remaining until the next occurrence of a fixed Jalali month/day (Nowruz, Yalda, …). */
export function distanceToAnnual(from: JalaliDate, target: { month: number; day: number; label: string }): AnnualDistance {
  const thisYear = { year: from.year, month: target.month, day: target.day };
  const delta = jalaliDayIndex(thisYear) - jalaliDayIndex(from);
  const resolved = delta >= 0 ? thisYear : { year: from.year + 1, month: target.month, day: target.day };
  const days = delta >= 0 ? delta : jalaliDayIndex(resolved) - jalaliDayIndex(from);
  return { days, target: resolved, label: target.label, formatted: formatJalaliNumeric(resolved) };
}

export const NOROOZ = { month: 1, day: 1, label: "نوروز" };
export const YALDA = { month: 9, day: 30, label: "شب یلدا" };

/* ------------------------------------------------------------------ *
 * Bulk tab
 * ------------------------------------------------------------------ */

export type BulkRow = { input: string; ok: boolean; jalali?: string; gregorian?: string; weekday?: string; errorFa?: string };
export type BulkParseResult = { rows: BulkRow[]; okCount: number; errorCount: number; truncated: boolean };
export const BULK_MAX_LINES = 1000;

export function convertBulk(text: string, direction: "jalali-to-gregorian" | "gregorian-to-jalali"): BulkParseResult {
  const allLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const truncated = allLines.length > BULK_MAX_LINES;
  const rows: BulkRow[] = [];
  for (const line of allLines.slice(0, BULK_MAX_LINES)) {
    const result = direction === "jalali-to-gregorian" ? convertJalali(line) : convertGregorian(line);
    if (result.ok) {
      rows.push({
        input: line,
        ok: true,
        jalali: formatJalaliNumeric(result.jalali),
        gregorian: formatGregorian(result.gregorian),
        weekday: result.weekdayFa,
      });
    } else {
      rows.push({ input: line, ok: false, errorFa: result.messageFa });
    }
  }
  return { rows, okCount: rows.filter((row) => row.ok).length, errorCount: rows.filter((row) => !row.ok).length, truncated };
}

export function bulkToCsv(result: BulkParseResult): string {
  const header = "input,jalali,gregorian,weekday";
  const body = result.rows
    .filter((row) => row.ok)
    .map((row) =>
      [row.input, row.jalali, row.gregorian, row.weekday]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
  return [header, ...body].join("\n");
}

/* ------------------------------------------------------------------ *
 * "Today" helpers
 * ------------------------------------------------------------------ */

/** Current Jalali date in the Asia/Tehran business timezone, computed arithmetically. */
export function jalaliToday(now: Date = new Date()): JalaliDate {
  const parts = new Intl.DateTimeFormat("en-US-u-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return gregorianToJalali({ year: value("year"), month: value("month"), day: value("day") });
}

export function monthLabel(month: number): string {
  return JALALI_MONTHS_FA[month - 1] ?? "";
}

export function asJalali(input: string): JalaliDate | null {
  return parseJalaliInput(input);
}

export { isJalaliValid, formatJalaliNumeric, formatJalaliLong };
