"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardMedia,
} from "@/components/molecules/card";
import { FilterBar, type FilterOption } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { useCatalogQuery, type CatalogParamMap } from "@/components/molecules/use-catalog-query";
import type { CourseListItem, Paginated } from "@/lib/api/types";

const ACADEMY_MAPPINGS: readonly CatalogParamMap[] = [
  { urlParam: "search", apiParam: "search" },
  { urlParam: "level", apiParam: "level" },
  { urlParam: "category", apiParam: "categories__slug" },
];

export function AcademyResults({
  data,
  filterParams,
}: {
  data: Paginated<CourseListItem> | null;
  filterParams?: Record<string, string>;
}) {
  const t = useTranslations("academy");
  const courses = data?.results ?? [];

  if (courses.length === 0) {
    return <p className="mt-10 text-muted-on-dark">{t("empty")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("title")}</h2>
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
  );
}

export function AcademyCatalog({
  locale,
  initialData,
  categoryOptions,
}: {
  locale: string;
  initialData: Paginated<CourseListItem> | null;
  categoryOptions: FilterOption[];
}) {
  const t = useTranslations("academy");
  const { data, filterParams } = useCatalogQuery<CourseListItem>({
    endpointPath: "/academy/",
    locale,
    initialData,
    mappings: ACADEMY_MAPPINGS,
  });

  return (
    <>
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
          options={categoryOptions}
        />
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-on-dark">{t("resultsCount", { count: data.count })}</p>
        ) : null}
      </div>
      <AcademyResults data={data} filterParams={filterParams} />
    </>
  );
}
