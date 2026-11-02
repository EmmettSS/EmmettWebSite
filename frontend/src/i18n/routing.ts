import { defineRouting } from "next-intl/routing";

/**
 * فارسی زبان پیش‌فرض و بدون پیشوند در URL است (`/`, `/about`, ...)؛
 * انگلیسی همیشه با پیشوند `/en` در دسترس است (`/en`, `/en/about`, ...).
 * این دقیقاً مطابق خواستهٔ صریح مأموریت پروژه است: «فارسی پیش‌فرض، انگلیسی در /en».
 */
export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
  localeCookie: {
    name: "NEXT_LOCALE",
  },
  /**
   * هدر ``Link`` را خودمان در ``src/proxy.ts`` می‌سازیم تا زبان‌ها
   * ``fa-IR``/``en``/``x-default`` باشند (پیش‌فرض next-intl کد کوتاه ``fa``
   * می‌نویسد). متاتگ‌های ``<link rel="alternate">`` از Metadata API می‌آیند و
   * مستقل از این تنظیم هستند.
   */
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];

export const localeDirections: Record<AppLocale, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};
