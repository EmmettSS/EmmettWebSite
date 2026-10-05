/**
 * توابع خالص مبدأ/مسیر سایت (بدون شبکه) — پایهٔ canonical و hreflang.
 *
 * ``PUBLIC_SITE_URL`` تنها منبع حقیقت دامنه است (ADR-0031): تا زمانی که دامنهٔ
 * نهایی قطعی نشده، همهٔ URLهای مطلق از این متغیر محیطی ساخته می‌شوند؛ نه در
 * کد hard-code می‌شوند و نه از هدر ``Host`` درخواست (که قابل جعل است).
 */

import { routing, type AppLocale } from "@/i18n/routing";

/** زبان HTML/OG هر locale — برای hreflang و ``<html lang>``. */
export const LOCALE_LANGUAGE_TAG: Record<AppLocale, string> = {
  fa: "fa-IR",
  en: "en",
};

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

/** تبدیل امن رشتهٔ locale درخواست به ``AppLocale`` (پیش‌فرض: فارسی). */
export function toAppLocale(value: string | undefined | null): AppLocale {
  return value && isAppLocale(value) ? value : routing.defaultLocale;
}

/** ``PUBLIC_SITE_URL`` را می‌خواند و بدون اسلش پایانی نرمال می‌کند. */
export function getPublicSiteUrl(): string {
  const raw =
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** مسیر را نرمال می‌کند: همیشه با ``/`` شروع، بدون اسلش پایانی (جز ریشه). */
export function normalizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0] ?? "";
  const withLeading = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  // همان قاعدهٔ ``core.normalize_redirect_path``: اسلش‌های تکراری هم فشرده
  // می‌شوند تا ``//services//web//`` و ``/services/web`` یک مسیر شناخته شوند.
  const collapsed = withLeading.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1) {
    return collapsed.replace(/\/+$/, "") || "/";
  }
  return collapsed;
}

/**
 * مسیر بومی‌سازی‌شده: فارسی بدون پیشوند و انگلیسی زیر ``/en`` (ADR-0004).
 *
 * ``localePath("en", "/blog") === "/en/blog"`` و
 * ``localePath("fa", "/blog") === "/blog"`` و ریشه برای انگلیسی ``/en`` است.
 */
export function localePath(locale: AppLocale | string, path: string): string {
  const normalized = normalizePath(path);
  const suffix = normalized === "/" ? "" : normalized;

  if (locale === routing.defaultLocale) {
    return suffix || "/";
  }
  return `/${locale}${suffix}`;
}

/** URL مطلق یک مسیر در یک locale. */
export function absoluteUrl(
  locale: AppLocale | string,
  path: string,
  siteUrl: string = getPublicSiteUrl(),
): string {
  return `${siteUrl.replace(/\/+$/, "")}${localePath(locale, path)}`;
}

/**
 * همهٔ URLهای زبانی یک مسیر برای ``alternates.languages``.
 *
 * ``x-default`` به فارسی (زبان پیش‌فرض) اشاره می‌کند — همان رفتار توصیه‌شدهٔ
 * Google برای سایت دوزبانه با یک نسخهٔ پیش‌فرض.
 */
export function languageAlternates(
  path: string,
  siteUrl: string = getPublicSiteUrl(),
): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of routing.locales) {
    alternates[LOCALE_LANGUAGE_TAG[locale]] = absoluteUrl(locale, path, siteUrl);
  }
  alternates["x-default"] = absoluteUrl(routing.defaultLocale, path, siteUrl);
  return alternates;
}

/**
 * پیشوند زبان را از مسیر برمی‌دارد (معکوس ``localePath``).
 *
 * ``stripLocalePrefix("/en/blog")`` ⇒ ``{ locale: "en", path: "/blog" }`` و
 * ``stripLocalePrefix("/blog")`` ⇒ ``{ locale: "fa", path: "/blog" }``.
 */
export function stripLocalePrefix(pathname: string): { locale: AppLocale; path: string } {
  const normalized = normalizePath(pathname);
  const [first, ...rest] = normalized.split("/").filter(Boolean);
  if (first && isAppLocale(first)) {
    return { locale: first, path: rest.length ? `/${rest.join("/")}` : "/" };
  }
  return { locale: routing.defaultLocale, path: normalized };
}

/**
 * هدر ``Link`` صفحه‌ها با ``rel="alternate"`` برای هر زبان.
 *
 * ``next-intl`` این هدر را با کد کوتاه زبان (``fa``) می‌ساخت که با
 * ``<link rel="alternate" hreflang="fa-IR">`` ناسازگار است؛ اینجا هر دو از
 * یک منبع (``languageAlternates``) ساخته می‌شوند تا دقیقاً ``fa-IR``/``en``/
 * ``x-default`` باشد (معیار پذیرش فاز ۷). هدر برای مسیرهای noindex ساخته
 * نمی‌شود تا hreflang به صفحهٔ noindex اشاره نکند.
 */
export function buildAlternateLinkHeader(
  pathname: string,
  siteUrl: string = getPublicSiteUrl(),
): string | null {
  const { path } = stripLocalePrefix(pathname);
  if (isNoindexPath(path)) return null;
  return Object.entries(languageAlternates(path, siteUrl))
    .map(([language, url]) => `<${url}>; rel="alternate"; hreflang="${language}"`)
    .join(", ");
}

/**
 * مسیرهای noindex از تنظیمات ادمین + مسیرهای سیستمی.
 *
 * مشترک بین ``robots.ts`` (Disallow) و متاتگ ``robots`` صفحه‌ها؛ اگر یک مسیر
 * اضافه شود، هر دو جا اثر می‌گذارد (جلوگیری از واگرایی robots/sitemap).
 */
export const SYSTEM_NOINDEX_PATHS = [
  "/admin",
  "/api",
  "/i18n",
  "/media",
  "/profile",
  "/search",
  // نتیجهٔ مشاورهٔ هر کاربر اختصاصی است؛ robots.txt هم همین را Disallow می‌کند.
  "/advisor/results",
];

export function mergeNoindexPaths(fromAdmin: string[]): string[] {
  const merged = new Set([...fromAdmin, ...SYSTEM_NOINDEX_PATHS]);
  return [...merged].sort();
}

/** آیا این مسیر باید noindex شود؟ (پیشوندها سگمنت‌به‌سگمنت بررسی می‌شوند) */
export function isNoindexPath(
  path: string,
  noindexPaths: string[] = SYSTEM_NOINDEX_PATHS,
): boolean {
  const normalized = normalizePath(path);
  return noindexPaths.some((candidate) => {
    const prefix = normalizePath(candidate);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
}
