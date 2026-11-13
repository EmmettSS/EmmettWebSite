"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
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
import type { BlogPostListItem, Paginated } from "@/lib/api/types";

const BLOG_MAPPINGS: readonly CatalogParamMap[] = [
  { urlParam: "search", apiParam: "search" },
  { urlParam: "category", apiParam: "categories__slug" },
  { urlParam: "tag", apiParam: "tags__slug" },
];

function formatDate(locale: string, iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function BlogResults({
  locale,
  data,
  filterParams,
}: {
  locale: string;
  data: Paginated<BlogPostListItem> | null;
  filterParams?: Record<string, string>;
}) {
  const t = useTranslations("blog");
  const posts = data?.results ?? [];

  if (posts.length === 0) {
    return <p className="mt-10 text-muted-on-dark">{t("empty")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("title")}</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.public_id} href={`/blog/${post.slug}`} className="block">
            <Card className="h-full overflow-hidden">
              {post.cover_image_url ? (
                <CardMedia>
                  <Image
                    src={post.cover_image_url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="aspect-video w-full object-cover"
                  />
                </CardMedia>
              ) : null}
              <CardHeader>
                <p className="text-xs text-muted-on-dark">
                  {formatDate(locale, post.published_at)}
                  {post.reading_time_minutes
                    ? ` · ${t("readingTime", { minutes: post.reading_time_minutes })}`
                    : ""}
                </p>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>{post.excerpt}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Pagination
        currentPage={data?.current_page ?? 1}
        totalPages={data?.total_pages ?? 1}
        basePath="/blog"
        searchParams={filterParams}
      />
    </>
  );
}

export function BlogCatalog({
  locale,
  initialData,
  categoryOptions,
}: {
  locale: string;
  initialData: Paginated<BlogPostListItem> | null;
  categoryOptions: FilterOption[];
}) {
  const t = useTranslations("blog");
  const { data, filterParams } = useCatalogQuery<BlogPostListItem>({
    endpointPath: "/blog/",
    locale,
    initialData,
    mappings: BLOG_MAPPINGS,
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
        {data && data.count > 0 ? (
          <p className="text-xs text-muted-on-dark">{t("resultsCount", { count: data.count })}</p>
        ) : null}
      </div>
      <BlogResults locale={locale} data={data} filterParams={filterParams} />
    </>
  );
}
