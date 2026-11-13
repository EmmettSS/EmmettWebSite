import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { getCategories, getServices } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";
import { ServicesCatalog, ServicesResults } from "./services-catalog";

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

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("services");

  const [data, categoriesData] = await Promise.all([
    getServices(locale),
    getCategories(locale, "service"),
  ]);

  const categories = categoriesData?.results ?? [];
  const categoryOptions = categories.map((cat) => ({ value: cat.slug, label: cat.name }));

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      <Suspense fallback={<ServicesResults data={data} />}>
        <ServicesCatalog locale={locale} initialData={data} categoryOptions={categoryOptions} />
      </Suspense>
    </div>
  );
}
