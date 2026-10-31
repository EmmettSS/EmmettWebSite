/**
 * ساخت متادیتای صفحه‌ها (فاز ۷ — ADR-0031).
 *
 * یک نقطهٔ واحد برای canonical، hreflang (``fa-IR``/``en``/``x-default``)،
 * Open Graph، Twitter، ``robots`` و تأیید Search Console تا همهٔ صفحه‌های
 * عمومی رفتار یکسان و قابل‌تست داشته باشند. متادیتای اختصاصی هر صفحه همیشه
 * اولویت دارد و در نبود آن، پیش‌فرض‌های ادمین/ترجمه جایگزین می‌شوند.
 */

import type { Metadata } from "next";

import type { AppLocale } from "@/i18n/routing";
import { toAbsoluteMediaUrl } from "@/lib/api/seo";
import { LOCALE_LANGUAGE_TAG, absoluteUrl, languageAlternates, localePath } from "@/lib/seo/site";
import type { SeoSettings } from "@/lib/seo/types";

export interface PageSeoInput {
  locale: AppLocale;
  /** مسیر بدون پیشوند زبان، مثل ``/blog/my-post`` */
  path: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  settings: SeoSettings;
  /** در صورت true، metadataBase از ``PUBLIC_SITE_URL`` خوانده می‌شود. */
  siteUrl: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string | null;
  authors?: string[];
  tags?: string[];
  noindex?: boolean;
  /** فید RSS این صفحه (در ``<link rel="alternate">`` می‌آید). */
  rssPath?: string;
}

function resolveSiteUrl(settings: SeoSettings, fallback: string): string {
  // اولویت: env فرانت (PUBLIC_SITE_URL) → مقدار API بک‌اند → پیش‌فرض لوکال.
  return (fallback || settings.public_site_url || "").replace(/\/+$/, "");
}

/**
 * URL تصویر OG پیش‌فرض همان locale (روت پویا ``opengraph-image``).
 *
 * وقتی صفحه ``openGraph`` خودش را تعریف می‌کند، Next تصویر file-convention را
 * دیگر خودکار اضافه نمی‌کند (باگ کشف‌شده در بازبینی: صفحه‌های متادیتا-دار
 * ``og:image`` نداشتند). پس اگر ادمین تصویر پیش‌فرض نداده باشد، همان تصویر
 * پویا صریحاً وصل می‌شود.
 */
function localeOgImageUrl(locale: AppLocale, siteUrl: string): string {
  return absoluteUrl(locale, "/opengraph-image", siteUrl);
}

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const siteUrl = resolveSiteUrl(input.settings, input.siteUrl);
  const title = input.title?.trim() || input.settings.default_meta_title;
  const description = input.description?.trim() || input.settings.default_meta_description;
  const canonical = absoluteUrl(input.locale, input.path, siteUrl);
  const image =
    toAbsoluteMediaUrl(input.imageUrl ?? input.settings.default_og_image, siteUrl) ??
    localeOgImageUrl(input.locale, siteUrl);

  // ``Metadata["openGraph"]`` یک union است (article/website/profile…)؛ برای
  // ساختن تدریجی، شیء را با فیلدهای اختیاری می‌سازیم و در نهایت به همان نوع
  // تبدیل می‌کنیم (بدون ``any``).
  const openGraphFields: Record<string, unknown> = {
    type: input.type ?? "website",
    url: canonical,
    title,
    description,
    siteName: input.settings.site_name,
    locale: LOCALE_LANGUAGE_TAG[input.locale].replace("-", "_"),
  };
  if (image) {
    openGraphFields.images = [{ url: image, width: 1200, height: 630, alt: title }];
  }
  if (input.type === "article" && input.publishedTime) {
    openGraphFields.publishedTime = input.publishedTime;
    openGraphFields.authors = input.authors;
    openGraphFields.tags = input.tags;
  }
  const openGraph = openGraphFields as Metadata["openGraph"];

  const twitterFields: Record<string, unknown> = {
    card: image ? "summary_large_image" : "summary",
    title,
    description,
  };
  if (input.settings.twitter_handle) {
    const handle = `@${input.settings.twitter_handle.replace(/^@/, "")}`;
    twitterFields.site = handle;
    twitterFields.creator = handle;
  }
  const twitter = twitterFields as Metadata["twitter"];

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(input.path, siteUrl),
      ...(input.rssPath
        ? { types: { "application/rss+xml": absoluteUrl(input.locale, input.rssPath, siteUrl) } }
        : {}),
    },
    openGraph,
    twitter,
    robots: input.noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
  };

  return metadata;
}

/** متادیتای سادهٔ صفحه‌های فهرست (بدون تصویر اختصاصی). */
export function buildListMetadata(input: Omit<PageSeoInput, "type" | "publishedTime">): Metadata {
  return buildPageMetadata(input);
}

/** مسیر بومی‌سازی‌شدهٔ فایل ``opengraph-image`` برای صفحه. */
export function ogImagePath(locale: AppLocale, path: string): string {
  return `${localePath(locale, path)}`.replace(/\/$/, "");
}
