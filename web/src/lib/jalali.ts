/** Persian-calendar utilities use the platform's ICU Persian calendar implementation. */
const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => faDigits.format(Number(digit)));
}
export function formatJalali(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric", ...options }).format(date);
}
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}
export function daysBetween(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86_400_000);
}
export function isIranianWeekend(date: Date): boolean { return date.getDay() === 5; }
export function addDays(date: Date, days: number): Date { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
