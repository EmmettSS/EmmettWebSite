import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Rss } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Card, CardHeader, CardTitle, CardDescription, CardMedia } from "@/components/molecules/card";
import { getBlogPosts } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/blog",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
    rssPath: "/blog/rss",
  });
}

function formatDate(locale: string, iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("blog");

  const data = await getBlogPosts(locale);
  const posts = data?.results ?? [];

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
        </div>
        <a
          href={locale === "fa" ? "/blog/rss" : "/en/blog/rss"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Rss aria-hidden="true" className="size-4" />
          {t("rssFeed")}
        </a>
      </header>

      {posts.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="text-xs text-muted-foreground">
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
      )}
    </div>
  );
}
