import type { MetadataRoute } from "next";

import { getSeoSettingsOrDefaults, getSitemapEntries } from "@/lib/api/seo";
import { absoluteUrl, getPublicSiteUrl, languageAlternates } from "@/lib/seo/site";

/**
 * ``/sitemap.xml`` پویا (فاز ۷ — ADR-0031).
 *
 * منبع داده: ``GET /api/v1/seo/sitemap/`` بک‌اند (صفحه‌های ثابت + همهٔ محتوای
 * منتشرشده، کش‌شده در Django). اینجا هیچ محتوایی دوباره استخراج نمی‌شود؛ فقط
 * به URL مطلق و ``alternates.languages`` تبدیل می‌شود.
 *
 * هر دو زبان با یک ورودی جدا فهرست می‌شوند (توصیهٔ Google: هر نسخهٔ زبانی
 * مستقل، همه با ``x-default`` یکسان). مسیرهای noindex هرگز وارد نمی‌شوند چون
 * در بک‌اند از فهرست sitemap بیرون‌اند (``SEO_NOINDEX_PATHS``).
 */
// در زمان build ممکن است بک‌اند در دسترس نباشد؛ ``force-dynamic`` باعث می‌شود
// خروجی خالی در build کش نشود و هر درخواست از API (که خودش کش دارد) تازه
// ساخته شود. هزینهٔ هر درخواست یک fetch کش‌شده + جست‌وجوی Map است.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, settings] = await Promise.all([getSitemapEntries(), getSeoSettingsOrDefaults()]);
  const siteUrl = (settings.public_site_url || getPublicSiteUrl()).replace(/\/+$/, "");

  const urls: MetadataRoute.Sitemap = [];
  for (const entry of entries) {
    const alternates = languageAlternates(entry.path, siteUrl);
    const lastModified = new Date(entry.lastmod);
    for (const [language, url] of Object.entries(alternates)) {
      // ``x-default`` یک ورودی تکراری می‌سازد؛ فقط زبان‌های واقعی فهرست می‌شوند.
      if (language === "x-default") continue;
      urls.push({
        url,
        lastModified,
        changeFrequency: entry.changefreq,
        priority: Number(entry.priority) || 0.5,
        alternates: { languages: alternates },
      });
    }
    // ورودی x-default برای مسیر ریشهٔ زبان پیش‌فرض لازم نیست؛ URL پیش‌فرض
    // (فارسی) در حلقهٔ بالا آمده و alternates کامل را دارد.
    void absoluteUrl;
  }

  return urls;
}
