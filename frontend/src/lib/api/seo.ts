/**
 * لایهٔ دادهٔ SEO در فرانت‌اند (فاز ۷ — ADR-0031).
 *
 * همهٔ فراخوانی‌ها **سمت سرور** انجام می‌شوند (Server Component/Route Handler/
 * proxy) و با ``revalidate`` کش می‌شوند؛ بنابراین بازدیدکنندهٔ ویترین هرگز
 * ارور/کندی بک‌اند را حس نمی‌کند و crawl موتور جست‌وجو هم به بک‌اند فشار
 * نمی‌آورد. هر تابع در صورت شکست ``null``/آرایهٔ خالی برمی‌گرداند تا رندر
 * صفحه هرگز با نبود تنظیمات SEO نشکند (قاعدهٔ «تخریب مهربان» فاز ۷).
 */

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSafeErrorType, logUpstreamFailure } from "@/lib/api/upstream-logging";
import { UPSTREAM_TIMEOUT_MS, getApiBaseUrl, internalServiceHeaders } from "@/lib/api/config";
import type {
  FaqPayload,
  RedirectPayload,
  SeoFaqItem,
  SeoRedirect,
  SeoSettings,
  SitemapEntry,
  SitemapPayload,
} from "@/lib/seo/types";

/** مدت اعتبار کش فرانت — هم‌راستا با ``SEO_SITEMAP_CACHE_SECONDS`` بک‌اند. */
export const SEO_REVALIDATE_SECONDS = 900;
export const REDIRECT_REVALIDATE_SECONDS = 300;

async function seoFetch<T>(
  path: string,
  revalidate: number,
  locale: string | undefined,
  tags: readonly string[],
): Promise<T | null> {
  const headers: Record<string, string> = {
    ...internalServiceHeaders(),
    "X-Forwarded-Proto": "https",
  };
  if (locale) {
    headers["Accept-Language"] = locale;
  }
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers,
      next: { revalidate, tags: [...tags] },
      // همان بودجهٔ زمانی لایهٔ SSR؛ نبودش یعنی معلق‌ماندن تا ۳۰۰ ثانیه در
      // بدترین حالت روی هاست اشتراکی (ر.ک. UPSTREAM_TIMEOUT_MS در server.ts).
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      logUpstreamFailure("django-seo", path, { status: response.status });
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    logUpstreamFailure("django-seo", path, { errorType: getSafeErrorType(error) });
    return null;
  }
}

/** تنظیمات SEO سایت (پیش‌فرض‌ها، سازمان، تأیید Search Console). */
export async function getSeoSettings(): Promise<SeoSettings | null> {
  return seoFetch<SeoSettings>("/seo/settings/", SEO_REVALIDATE_SECONDS, undefined, [
    CACHE_TAGS.seoSettings,
  ]);
}

/** همهٔ URLهای عمومی برای ``sitemap.xml``. */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const payload = await seoFetch<SitemapPayload>(
    "/seo/sitemap/",
    SEO_REVALIDATE_SECONDS,
    undefined,
    [CACHE_TAGS.sitemap],
  );
  return payload?.results ?? [];
}

/** نگاشت ریدایرکت‌های مدیریت‌شده (۳۰۱/۳۰۲/۴۱۰). */
export async function getSeoRedirects(): Promise<SeoRedirect[]> {
  const payload = await seoFetch<RedirectPayload>(
    "/seo/redirects/",
    REDIRECT_REVALIDATE_SECONDS,
    undefined,
    [CACHE_TAGS.redirects],
  );
  return payload?.results ?? [];
}

/** پرسش‌های متداول یک مسیر (برای JSON-LD نوع FAQPage). */
export async function getFaqForPath(path: string, locale: string): Promise<SeoFaqItem[]> {
  const payload = await seoFetch<FaqPayload>(
    `/seo/faq/?path=${encodeURIComponent(path)}`,
    SEO_REVALIDATE_SECONDS,
    locale,
    [locale === "en" ? CACHE_TAGS.faqEn : CACHE_TAGS.faqFa],
  );
  return payload?.results ?? [];
}

/**
 * خواندن تنظیمات SEO با پیش‌فرض‌های ایمن — نسخه‌ای که هرگز ``null`` نمی‌دهد.
 *
 * در نبود بک‌اند (توسعهٔ فرانت به‌تنهایی یا قطعی موقت)، متادیتا از ترجمه‌های
 * next-intl ساخته می‌شود و سایت با دامنهٔ ``PUBLIC_SITE_URL`` بالا می‌آید.
 */
export async function getSeoSettingsOrDefaults(): Promise<SeoSettings> {
  const settings = await getSeoSettings();
  if (settings) return settings;
  return {
    site_name: "Emmett",
    default_locale: "fa",
    public_site_url: "",
    locales: [
      { code: "fa", label: "فارسی" },
      { code: "en", label: "English" },
    ],
    default_meta_title: "",
    default_meta_description: "",
    search_console_verification: "",
    twitter_handle: "",
    organization: {
      name: "Emmett",
      legal_name: "",
      url: "",
      email: "",
      phone: "",
      address: "",
      same_as: [],
      logo_url: "",
    },
    default_og_image: null,
    noindex_paths: [],
    sitemap_sections: ["pages", "services", "projects", "blog", "academy"],
    generated_at: new Date(0).toISOString(),
    two_factor_required: false,
    search_console_help: "",
  };
}

/**
 * URL مطلق تصویر رسانه؛ خروجی بک‌اند می‌تواند نسبی (``/media/...``) یا مطلق
 * (``https://cdn/...``) باشد.
 */
export function toAbsoluteMediaUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteUrl.replace(/\/+$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}
