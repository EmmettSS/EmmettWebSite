import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { SearchBox } from "@/components/organisms/search-box";
import type { AppLocale } from "@/i18n/routing";
import { extractForwardedClientIp, searchSite } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageTitleClass } from "@/components/ui-port/page-frame";

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
  const clientIp = query ? extractForwardedClientIp(await headers()) : undefined;
  const data = query ? await searchSite(locale, query, clientIp) : null;

  return (
    <div className={frameWidth.narrow}>
      <h1 className={pageTitleClass}>{t("title")}</h1>

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
                    className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
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
