import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardMedia,
} from "@/components/molecules/card";
import { FilterBar } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { getCategories, getProjects, getTags } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";

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

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("projects");

  const page = typeof query.page === "string" ? query.page : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;
  const tag = typeof query.tag === "string" ? query.tag : undefined;
  const year = typeof query.year === "string" ? query.year : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;

  const queryString = new URLSearchParams();
  if (page) queryString.set("page", page);
  if (search) queryString.set("search", search);
  if (category) queryString.set("categories__slug", category);
  if (tag) queryString.set("tags__slug", tag);
  if (year) queryString.set("year", year);

  const [data, categoriesData, tagsData] = await Promise.all([
    getProjects(locale, queryString.toString()),
    getCategories(locale, "portfolio"),
    getTags(locale),
  ]);

  const projects = data?.results ?? [];
  const categories = categoriesData?.results ?? [];
  const tags = tagsData?.results ?? [];

  const filterParams: Record<string, string> = {};
  if (search) filterParams.search = search;
  if (category) filterParams.category = category;
  if (tag) filterParams.tag = tag;
  if (year) filterParams.year = year;

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <FilterBar
          label={t("filterByIndustry")}
          paramName="category"
          allLabel={t("allIndustries")}
          options={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
        />
        <FilterBar
          label={t("filterByTechnology")}
          paramName="tag"
          allLabel={t("allTechnologies")}
          options={tags.slice(0, 12).map((tagItem) => ({ value: tagItem.slug, label: tagItem.name }))}
        />
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("resultsCount", { count: data.count })}
          </p>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.public_id} href={`/projects/${project.slug}`} className="block">
                <Card className="h-full overflow-hidden">
                  {project.cover_image_url ? (
                    <CardMedia>
                      <Image
                        src={project.cover_image_url}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="aspect-video w-full object-cover"
                      />
                    </CardMedia>
                  ) : null}
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      {project.is_product ? <Badge variant="accent">{t("products")}</Badge> : null}
                      {project.year ? <Badge variant="technical">{project.year}</Badge> : null}
                    </div>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>{project.summary}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination
            currentPage={data?.current_page ?? 1}
            totalPages={data?.total_pages ?? 1}
            basePath="/projects"
            searchParams={filterParams}
          />
        </>
      )}
    </div>
  );
}
