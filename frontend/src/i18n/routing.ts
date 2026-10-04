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
});

export type AppLocale = (typeof routing.locales)[number];

export const localeDirections: Record<AppLocale, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};
