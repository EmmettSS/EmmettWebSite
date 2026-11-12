import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/molecules/card";
import { FilterBar } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { getCategories, getServices } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/services",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("services");

  const page = typeof query.page === "string" ? query.page : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;
  const featured = typeof query.featured === "string" ? query.featured : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;

  const queryString = new URLSearchParams();
  if (page) queryString.set("page", page);
  if (search) queryString.set("search", search);
  if (featured === "true") queryString.set("is_featured", "true");
  if (category) queryString.set("categories__slug", category);

  const [data, categoriesData] = await Promise.all([
    getServices(locale, queryString.toString()),
    getCategories(locale, "service"),
  ]);

  const services = data?.results ?? [];
  const categories = categoriesData?.results ?? [];

  const filterParams: Record<string, string> = {};
  if (search) filterParams.search = search;
  if (featured) filterParams.featured = featured;
  if (category) filterParams.category = category;

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <FilterBar
          label={t("filterByCategory")}
          paramName="category"
          allLabel={t("allCategories")}
          options={categories.map((cat) => ({ value: cat.slug, label: cat.name }))}
        />
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("filterByFeatured")}
          </span>
          <FilterBar
            label=""
            paramName="featured"
            allLabel={t("all")}
            options={[{ value: "true", label: t("featuredOnly") }]}
          />
        </div>
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("resultsCount", { count: data.count })}
          </p>
        ) : null}
      </div>

      {services.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
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
      )}
    </div>
  );
}
