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
import { Pagination } from "@/components/molecules/pagination";
import { useCatalogQuery, type CatalogParamMap } from "@/components/molecules/use-catalog-query";
import type { Paginated, ProjectListItem } from "@/lib/api/types";

const PRODUCT_MAPPINGS: readonly CatalogParamMap[] = [];
const PRODUCT_FIXED_PARAMS = { is_product: "true" } as const;

export function ProductsResults({ data }: { data: Paginated<ProjectListItem> | null }) {
  const t = useTranslations("projects");
  const products = data?.results ?? [];

  if (products.length === 0) {
    return <p className="mt-10 text-muted-on-dark">{t("empty")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("products")}</h2>
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
  );
}

export function ProductsCatalog({
  locale,
  initialData,
}: {
  locale: string;
  initialData: Paginated<ProjectListItem> | null;
}) {
  const { data } = useCatalogQuery<ProjectListItem>({
    endpointPath: "/projects/",
    locale,
    initialData,
    mappings: PRODUCT_MAPPINGS,
    fixedParams: PRODUCT_FIXED_PARAMS,
  });

  return <ProductsResults data={data} />;
}
