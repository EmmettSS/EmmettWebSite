import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { SearchBox } from "@/components/organisms/search-box";
import type { AppLocale } from "@/i18n/routing";
import { searchSite } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/search",
    title: t("title"),

    settings,
    siteUrl: getPublicSiteUrl(),
    noindex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("search");

  const query = (q ?? "").trim();
  const data = query ? await searchSite(locale, query) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-6">
        <SearchBox initialQuery={query} />
      </div>

      <div className="mt-8">
        {!query ? (
          <p className="text-muted-foreground">{t("prompt")}</p>
        ) : !data || data.results.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("resultsCount", { count: data.count, query })}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {data.results.map((result) => (
                <li key={`${result.content_type}-${result.public_id}`}>
                  <Link
                    href={result.url_path}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary"
                  >
                    {result.category_label ? (
                      <Badge variant="technical" className="w-fit">
                        {result.category_label}
                      </Badge>
                    ) : null}
                    <span className="font-medium text-foreground">{result.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
