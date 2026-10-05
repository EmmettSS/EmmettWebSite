import type { Metadata } from "next";

import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

/**
 * متادیتای صفحهٔ «سیستم طراحی» از یک ``layout`` سروری می‌آید.
 *
 * خودِ صفحه یک Client Component است (تعامل نمونه‌کامپوننت‌ها) و نمی‌تواند
 * ``generateMetadata`` داشته باشد؛ بدون این فایل، صفحه متادیتای پیش‌فرض layout
 * زبان را ارث می‌برد و canonical اشتباه ``/`` می‌گرفت (ADR-0031).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/design-system",
    title: "Design System",
    description: settings.default_meta_description,
    settings,
    siteUrl: getPublicSiteUrl(),
    noindex: true,
  });
}

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
