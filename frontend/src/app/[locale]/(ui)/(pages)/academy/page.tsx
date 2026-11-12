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
import { getCategories, getCourses } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";
import {
  FeedLink,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
} from "@/components/ui-port/page-frame";

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

export default async function AcademyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("academy");

  const page = typeof query.page === "string" ? query.page : undefined;
  const level = typeof query.level === "string" ? query.level : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;

  const queryString = new URLSearchParams();
  if (page) queryString.set("page", page);
  if (search) queryString.set("search", search);
  if (level) queryString.set("level", level);
  if (category) queryString.set("categories__slug", category);

  const [data, categoriesData] = await Promise.all([
    getCourses(locale, queryString.toString()),
    getCategories(locale, "academy"),
  ]);

  const courses = data?.results ?? [];
  const categories = categoriesData?.results ?? [];

  const filterParams: Record<string, string> = {};
  if (search) filterParams.search = search;
  if (level) filterParams.level = level;
  if (category) filterParams.category = category;

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

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <FilterBar
          label={t("level")}
          paramName="level"
          allLabel={t("allLevels")}
          options={[
            { value: "beginner", label: t("levels.beginner") },
            { value: "intermediate", label: t("levels.intermediate") },
            { value: "advanced", label: t("levels.advanced") },
          ]}
        />
        <FilterBar
          label={t("filterByCategory")}
          paramName="category"
          allLabel={t("allCategories")}
          options={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
        />
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("resultsCount", { count: data.count })}
          </p>
        ) : null}
      </div>

      {courses.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.public_id} href={`/academy/${course.slug}`} className="block">
                <Card className="h-full overflow-hidden">
                  {course.cover_image_url ? (
                    <CardMedia>
                      <Image
                        src={course.cover_image_url}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="aspect-video w-full object-cover"
                      />
                    </CardMedia>
                  ) : null}
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="technical">{t(`levels.${course.level}`)}</Badge>
                      {course.is_featured ? <Badge variant="accent">★</Badge> : null}
                    </div>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.summary}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination
            currentPage={data?.current_page ?? 1}
            totalPages={data?.total_pages ?? 1}
            basePath="/academy"
            searchParams={filterParams}
          />
        </>
      )}
    </div>
  );
}
