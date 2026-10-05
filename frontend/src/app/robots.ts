import type { MetadataRoute } from "next";

import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { getPublicSiteUrl, mergeNoindexPaths } from "@/lib/seo/site";

/**
 * ``/robots.txt`` (فاز ۷ — ADR-0031).
 *
 * مسیرهای Disallow از دو منبع می‌آیند: ``SEO_NOINDEX_PATHS`` بک‌اند (قابل
 * ویرایش از ادمین) و فهرست سیستمی فرانت. برای هر مسیر، هر دو نسخهٔ زبانی
 * نوشته می‌شود تا ``/en/profile`` هم بسته باشد.
 *
 * نکته: ``/advisor/results/*`` نتیجهٔ اختصاصی هر کاربر است؛ اگر ایندکس شود
 * هم محتوای کاربران بیرون می‌افتد و هم با ``noindex`` صفحه در تضاد است.
 */
// در زمان build ممکن است بک‌اند در دسترس نباشد؛ ``force-dynamic`` باعث می‌شود
// خروجی خالی در build کش نشود و هر درخواست از API (که خودش کش دارد) تازه
// ساخته شود. هزینهٔ هر درخواست یک fetch کش‌شده + جست‌وجوی Map است.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = (settings.public_site_url || getPublicSiteUrl()).replace(/\/+$/, "");

  const disallow = new Set<string>();
  for (const path of mergeNoindexPaths(settings.noindex_paths)) {
    disallow.add(path);
    disallow.add(`/en${path === "/" ? "" : path}`);
  }
  disallow.add("/advisor/results/");
  disallow.add("/en/advisor/results/");
  // پیشوندها با اسلش پایانی هم بسته شوند (Sitemap/API doc و مسیرهای فرزند).
  for (const path of ["/api", "/admin", "/media"]) {
    disallow.add(`${path}/`);
    disallow.add(`/en${path}/`);
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...disallow].sort(),
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
