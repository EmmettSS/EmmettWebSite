import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { getBlogPosts, getCategories } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import {
  FeedLink,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
} from "@/components/ui-port/page-frame";
import { BlogCatalog, BlogResults } from "./blog-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/blog",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
    rssPath: "/blog/rss",
  });
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("blog");

  const [data, categoriesData] = await Promise.all([
    getBlogPosts(locale),
    getCategories(locale, "blog"),
  ]);

  const categories = categoriesData?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className={pageTitleClass}>{t("title")}</h1>
          <p className={pageLeadClass}>{t("description")}</p>
        </div>
        <FeedLink href={locale === "fa" ? "/blog/rss" : "/en/blog/rss"}>{t("rssFeed")}</FeedLink>
      </header>

      <Suspense fallback={<BlogResults locale={locale} data={data} />}>
        <BlogCatalog
          locale={locale}
          initialData={data}
          categoryOptions={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
        />
      </Suspense>
    </div>
  );
}
