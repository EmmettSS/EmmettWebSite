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
import { Pagination } from "@/components/molecules/pagination";
import { getProjects } from "@/lib/api/server";
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
    path: "/products",
    title: t("products"),
    description: t("productsDescription"),
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function ProductsPage({
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

  const pageParam = typeof query.page === "string" ? query.page : undefined;
  const queryString = new URLSearchParams({ is_product: "true" });
  if (pageParam) queryString.set("page", pageParam);

  const data = await getProjects(locale, queryString.toString());
  const products = data?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("products")}</h1>
        <p className={pageLeadClass}>{t("productsDescription")}</p>
      </header>

      {products.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((project) => (
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
                    {project.year ? <Badge variant="technical">{project.year}</Badge> : null}
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
            basePath="/products"
          />
        </>
      )}
    </div>
  );
}
