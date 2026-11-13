import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { getCategories, getCourses } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import {
  FeedLink,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
} from "@/components/ui-port/page-frame";
import { AcademyCatalog, AcademyResults } from "./academy-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/academy",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
    rssPath: "/academy/rss",
  });
}

export default async function AcademyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("academy");

  const [data, categoriesData] = await Promise.all([
    getCourses(locale),
    getCategories(locale, "academy"),
  ]);

  const categories = categoriesData?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className={pageTitleClass}>{t("title")}</h1>
          <p className={pageLeadClass}>{t("description")}</p>
        </div>
        <FeedLink href={locale === "fa" ? "/academy/rss" : "/en/academy/rss"}>
          {t("rssFeed")}
        </FeedLink>
      </header>

      <Suspense fallback={<AcademyResults data={data} />}>
        <AcademyCatalog
          locale={locale}
          initialData={data}
          categoryOptions={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
        />
      </Suspense>
    </div>
  );
}
