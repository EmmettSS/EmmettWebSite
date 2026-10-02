/**
 * Persian (Jalali) calendar utilities.
 *
 * Conversion follows the arithmetic algorithm published by Kazimierz M. Borkowski
 * ("The Persian calendar for 3000 years", Earth, Moon and Planets 74, 1996) —
 * the same well-known reference used by public implementations such as `jalaali-js`.
 * Leap years are derived arithmetically from a 33-year cycle with documented
 * correction breaks; there is no hard-coded leap-year or holiday table here.
 *
 * The implementation is pure (no DOM, no Intl dependency) so the very same module runs
 * in the browser, in the Static Bridge prerender step and in unit tests.
 */

const BREAKS = Object.freeze([
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
]);
export const MIN_JALALI_YEAR = 1200;
export const MAX_JALALI_YEAR = 1500;

export type JalaliDate = { year: number; month: number; day: number };
export type GregorianDate = { year: number; month: number; day: number };

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`Jalali year out of supported range: ${jy}`);
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { year: gy, month: gm, day: gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).year;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  const jm = 7 + div(k, 30);
  const jd = mod(k, 30) + 1;
  return { year: jy, month: jm, day: jd };
}

/** True when the given Jalali year is a leap year (٣٠-day Esfand). */
export function isJalaliLeapYear(year: number): boolean {
  return jalCal(year).leap === 0;
}

/** Number of days in a Jalali month (1..12). */
export function jalaliMonthLength(year: number, month: number): number {
  if (month < 1 || month > 12) throw new Error(`Invalid Jalali month: ${month}`);
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

export function isJalaliValid(date: JalaliDate): boolean {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) return false;
  if (date.year < MIN_JALALI_YEAR || date.year > MAX_JALALI_YEAR) return false;
  if (date.month < 1 || date.month > 12) return false;
  return date.day >= 1 && date.day <= jalaliMonthLength(date.year, date.month);
}

export function jalaliToGregorian(date: JalaliDate): GregorianDate {
  if (!isJalaliValid(date)) throw new Error(`Invalid Jalali date: ${date.year}-${date.month}-${date.day}`);
  return d2g(j2d(date.year, date.month, date.day));
}

export function gregorianToJalali(date: GregorianDate): JalaliDate {
  const result = d2j(g2d(date.year, date.month, date.day));
  if (result.year < MIN_JALALI_YEAR || result.year > MAX_JALALI_YEAR) {
    throw new Error(`Gregorian date outside the supported Jalali range: ${date.year}-${date.month}-${date.day}`);
  }
  return result;
}

/** Days since the Unix epoch for a date-only value (UTC anchored, no timezone drift). */
export function gregorianToDayNumber(date: GregorianDate): number {
  return g2d(date.year, date.month, date.day) - 2440588;
}
export function dayNumberToGregorian(dayNumber: number): GregorianDate {
  return d2g(dayNumber + 2440588);
}
export function jalaliToDayNumber(date: JalaliDate): number {
  return j2d(date.year, date.month, date.day) - 2440588;
}
export function dayNumberToJalali(dayNumber: number): JalaliDate {
  return d2j(dayNumber + 2440588);
}

/** 0 = Saturday (شنبه) … 6 = Friday (جمعه) — the Iranian week starts on Saturday. */
export function jalaliWeekday(date: JalaliDate): number {
  // Day 0 is 1970-01-01, a Thursday → Saturday is index 0 of the Iranian week.
  return mod(jalaliToDayNumber(date) + 5, 7);
}

export const JALALI_MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;
export const WEEKDAYS_FA = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"] as const;
export const JALALI_MONTHS_EN = [
  "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand",
] as const;

const FA_DIGIT = (digit: string) => String.fromCharCode(0x06f0 + Number(digit));
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, FA_DIGIT);
}
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

export function formatJalaliNumeric(date: JalaliDate, opts: { persianDigits?: boolean; pad?: boolean } = {}): string {
  const pad = opts.pad ?? true;
  const part = (value: number) => (pad ? String(value).padStart(2, "0") : String(value));
  const text = `${date.year}/${part(date.month)}/${part(date.day)}`;
  return opts.persianDigits ? toPersianDigits(text) : text;
}

export function formatJalaliLong(date: JalaliDate, lang: "fa" | "en" = "fa"): string {
  const weekday = lang === "fa" ? WEEKDAYS_FA[jalaliWeekday(date)] : null;
  const month = lang === "fa" ? JALALI_MONTHS_FA[date.month - 1] : JALALI_MONTHS_EN[date.month - 1];
  const core = `${date.day} ${month} ${date.year}`;
  const digits = lang === "fa" ? toPersianDigits(core) : core;
  return weekday ? `${weekday}، ${digits}` : digits;
}

export function formatJalali(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date);
}

function partsToJalali(date: Date): JalaliDate {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Jalali date for an instant, evaluated in the Asia/Tehran business timezone. */
export function toJalali(date: Date): JalaliDate {
  return partsToJalali(date);
}

export function iranNow(): Date {
  return new Date();
}

export function daysBetween(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function isIranianWeekend(date: Date): boolean {
  return date.getDay() === 5;
}
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Accepts Jalali dates written with Persian, Arabic or Latin digits and / . - separators. */
export function parseJalaliInput(input: string): JalaliDate | null {
  const normalized = toLatinDigits(input.trim()).replace(/[.\-–—]/g, "/").replace(/\s+/g, "");
  const match = /^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isJalaliValid(date) ? date : null;
}

/** Accepts Gregorian dates written with Persian, Arabic or Latin digits. */
export function parseGregorianInput(input: string): GregorianDate | null {
  const normalized = toLatinDigits(input.trim()).replace(/[.\-–—]/g, "/").replace(/\s+/g, "");
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day));
  if (check.getUTCFullYear() !== date.year || check.getUTCMonth() !== date.month - 1 || check.getUTCDate() !== date.day) return null;
  return date;
}
