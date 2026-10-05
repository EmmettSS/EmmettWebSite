import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProjectEstimatorForm } from "@/components/organisms/project-estimator-form";
import type { AppLocale } from "@/i18n/routing";
import { getCatalogs } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

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
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("estimatorTitle")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{t("estimatorDescription")}</p>
      </header>
      <section className="mt-10 rounded-xl border border-border bg-background p-5 sm:p-8">
        <ProjectEstimatorForm catalogs={catalogs} />
      </section>
    </div>
  );
}
