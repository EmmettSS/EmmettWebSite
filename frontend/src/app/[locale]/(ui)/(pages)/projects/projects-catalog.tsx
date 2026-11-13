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
import type { Paginated, ProjectListItem } from "@/lib/api/types";

const PROJECT_MAPPINGS: readonly CatalogParamMap[] = [
  { urlParam: "search", apiParam: "search" },
  { urlParam: "category", apiParam: "categories__slug" },
  { urlParam: "tag", apiParam: "tags__slug" },
  { urlParam: "year", apiParam: "year" },
];

export function ProjectsResults({
  data,
  filterParams,
}: {
  data: Paginated<ProjectListItem> | null;
  filterParams?: Record<string, string>;
}) {
  const t = useTranslations("projects");
  const projects = data?.results ?? [];

  if (projects.length === 0) {
    return <p className="mt-10 text-muted-on-dark">{t("empty")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("title")}</h2>
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
  );
}

export function ProjectsCatalog({
  locale,
  initialData,
  categoryOptions,
  tagOptions,
}: {
  locale: string;
  initialData: Paginated<ProjectListItem> | null;
  categoryOptions: FilterOption[];
  tagOptions: FilterOption[];
}) {
  const t = useTranslations("projects");
  const { data, filterParams } = useCatalogQuery<ProjectListItem>({
    endpointPath: "/projects/",
    locale,
    initialData,
    mappings: PROJECT_MAPPINGS,
  });

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <FilterBar
          label={t("filterByIndustry")}
          paramName="category"
          allLabel={t("allIndustries")}
          options={categoryOptions}
        />
        <FilterBar
          label={t("filterByTechnology")}
          paramName="tag"
          allLabel={t("allTechnologies")}
          options={tagOptions}
        />
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-on-dark">{t("resultsCount", { count: data.count })}</p>
        ) : null}
      </div>
      <ProjectsResults data={data} filterParams={filterParams} />
    </>
  );
}
