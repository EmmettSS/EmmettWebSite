import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { getProjects } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";
import { ProductsCatalog, ProductsResults } from "./products-catalog";

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

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("projects");

  const data = await getProjects(locale, "is_product=true");

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("products")}</h1>
        <p className={pageLeadClass}>{t("productsDescription")}</p>
      </header>

      <Suspense fallback={<ProductsResults data={data} />}>
        <ProductsCatalog locale={locale} initialData={data} />
      </Suspense>
    </div>
  );
}
