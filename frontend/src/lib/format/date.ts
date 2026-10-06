import dayjs from "dayjs";
import jalaliday from "jalaliday/dayjs";
import "dayjs/locale/fa";
import "dayjs/locale/en";

import type { AppLocale } from "@/i18n/routing";

dayjs.extend(jalaliday);

export type DateInput = string | number | Date;

/**
 * طبق `ADR-0004` (بک‌اند) و `ADR-0019` (فرانت): API همیشه ISO-8601 میلادی/UTC
 * برمی‌گرداند؛ تبدیل به تقویم شمسی/میلادی و فرمت نهایی فقط در همین لایهٔ
 * نمایش انجام می‌شود — هرگز مستقیماً `dayjs`/`jalaliday` را در کامپوننت‌ها
 * import نکنید، همیشه از این توابع استفاده کنید (DRY + قابلیت تست مطابق
 * قرارداد پروژه).
 */
export function formatDate(
  isoDate: DateInput,
  locale: AppLocale,
  options?: { withTime?: boolean },
): string {
  const instance = dayjs(isoDate);

  if (!instance.isValid()) {
    return "";
  }

  if (locale === "fa") {
    const jalali = instance.calendar("jalali").locale("fa");
    return options?.withTime ? jalali.format("D MMMM YYYY، HH:mm") : jalali.format("D MMMM YYYY");
  }

  const gregorian = instance.calendar("gregory").locale("en");
  return options?.withTime
    ? gregorian.format("MMMM D, YYYY, HH:mm")
    : gregorian.format("MMMM D, YYYY");
}

/** امروز، فرمت‌شده مطابق قرارداد تقویم هر locale. */
export function formatToday(locale: AppLocale): string {
  return formatDate(new Date(), locale);
}
