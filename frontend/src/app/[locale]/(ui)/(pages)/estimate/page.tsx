import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProjectEstimatorForm } from "@/components/organisms/project-estimator-form";
import type { AppLocale } from "@/i18n/routing";
import { getCatalogs } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import {
  PageEyebrow,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
  panelClass,
} from "@/components/ui-port/page-frame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ai" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/estimate",
    title: t("estimatorTitle"),
    description: t("estimatorDescription"),
    settings,
    siteUrl: getPublicSiteUrl(),
    noindex: true,
  });
}

export default async function ProjectEstimatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("ai");
  const catalogs = await getCatalogs(locale, [
    "job_role",
    "business_size",
    "city_scale",
    "budget_range",
    "team_size",
    "goal",
    "delivery_scope",
  ]);

  return (
    <div className={frameWidth.reading}>
      <header className="max-w-2xl">
        <PageEyebrow>{t("eyebrow")}</PageEyebrow>
        <h1 className={pageTitleClass}>{t("estimatorTitle")}</h1>
        <p className={pageLeadClass}>{t("estimatorDescription")}</p>
      </header>
      <section className={`mt-10 ${panelClass}`}>
        <ProjectEstimatorForm catalogs={catalogs} />
      </section>
    </div>
  );
}
