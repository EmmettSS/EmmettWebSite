"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/molecules/card";
import { FilterBar, type FilterOption } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { useCatalogQuery, type CatalogParamMap } from "@/components/molecules/use-catalog-query";
import type { Paginated, ServiceListItem } from "@/lib/api/types";

const SERVICE_MAPPINGS: readonly CatalogParamMap[] = [
  { urlParam: "search", apiParam: "search" },
  { urlParam: "featured", apiParam: "is_featured", onlyValue: "true" },
  { urlParam: "category", apiParam: "categories__slug" },
];

export function ServicesResults({
  data,
  filterParams,
}: {
  data: Paginated<ServiceListItem> | null;
  filterParams?: Record<string, string>;
}) {
  const t = useTranslations("services");
  const services = data?.results ?? [];

  if (services.length === 0) {
    return <p className="mt-10 text-muted-on-dark">{t("empty")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("listHeading")}</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Link key={service.public_id} href={`/services/${service.slug}`} className="block">
            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  {service.is_featured ? <Badge variant="accent">★</Badge> : null}
                  {service.categories.slice(0, 2).map((cat) => (
                    <Badge key={cat.slug} variant="outline">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
                <CardTitle>{service.title}</CardTitle>
                <CardDescription>{service.summary}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Pagination
        currentPage={data?.current_page ?? 1}
        totalPages={data?.total_pages ?? 1}
        basePath="/services"
        searchParams={filterParams}
      />
    </>
  );
}

export function ServicesCatalog({
  locale,
  initialData,
  categoryOptions,
}: {
  locale: string;
  initialData: Paginated<ServiceListItem> | null;
  categoryOptions: FilterOption[];
}) {
  const t = useTranslations("services");
  const { data, filterParams } = useCatalogQuery<ServiceListItem>({
    endpointPath: "/services/",
    locale,
    initialData,
    mappings: SERVICE_MAPPINGS,
  });

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <FilterBar
          label={t("filterByCategory")}
          paramName="category"
          allLabel={t("allCategories")}
          options={categoryOptions}
        />
        <FilterBar
          label={t("filterByFeatured")}
          paramName="featured"
          allLabel={t("all")}
          options={[{ value: "true", label: t("featuredOnly") }]}
        />
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-on-dark">{t("resultsCount", { count: data.count })}</p>
        ) : null}
      </div>
      <ServicesResults data={data} filterParams={filterParams} />
    </>
  );
}
