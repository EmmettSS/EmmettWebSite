import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { getCategories, getProjects, getTags } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";
import { ProjectsCatalog, ProjectsResults } from "./projects-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/projects",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("projects");

  const [data, categoriesData, tagsData] = await Promise.all([
    getProjects(locale),
    getCategories(locale, "portfolio"),
    getTags(locale),
  ]);

  const categories = categoriesData?.results ?? [];
  const tags = tagsData?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      <Suspense fallback={<ProjectsResults data={data} />}>
        <ProjectsCatalog
          locale={locale}
          initialData={data}
          categoryOptions={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
          tagOptions={tags.slice(0, 12).map((tagItem) => ({
            value: tagItem.slug,
            label: tagItem.name,
          }))}
        />
      </Suspense>
    </div>
  );
}
