import type { AppLocale } from "@/i18n/routing";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const EN_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const localeTag: Record<AppLocale, string> = {
  fa: "fa-IR",
  en: "en-US",
};

/**
 * فرمت استاندارد عدد/درصد/پول با سیستم ارقام درست هر زبان (قانون ۱۰: اعداد
 * فارسی در FA، لاتین در EN). روی `Intl.NumberFormat` بومی پلتفرم تکیه می‌کند
 * — بدون وابستگی اضافه.
 */
export function formatNumber(
  value: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTag[locale], options).format(value);
}

/** تبدیل ارقام داخل یک رشتهٔ دلخواه (نه لزوماً یک عدد خالص) به سیستم ارقام locale. */
export function toLocaleDigits(input: string, locale: AppLocale): string {
  if (locale === "fa") {
    return input.replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
  }

  return input.replace(/[۰-۹]/g, (digit) => {
    const index = FA_DIGITS.indexOf(digit);
    return index === -1 ? digit : (EN_DIGITS[index] ?? digit);
  });
}
