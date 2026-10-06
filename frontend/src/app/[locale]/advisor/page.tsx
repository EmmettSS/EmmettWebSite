import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreativeAdvisorForm } from "@/components/organisms/creative-advisor-form";
import { Link } from "@/i18n/navigation";
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
    path: "/advisor",
    title: t("advisorTitle"),
    description: t("advisorDescription"),
    settings,
    siteUrl: getPublicSiteUrl(),
    noindex: true,
  });
}

export default async function CreativeAdvisorPage({
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
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("advisorTitle")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{t("advisorDescription")}</p>
      </header>

      <section className="mt-10 rounded-xl border border-border bg-background p-5 sm:p-8">
        <CreativeAdvisorForm catalogs={catalogs} />
      </section>

      <p className="mt-6 text-sm leading-6 text-muted-foreground">{t("preliminaryDisclaimer")}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("estimatorPrompt")}{" "}
        <Link href="/estimate" className="font-medium text-primary underline underline-offset-4">
          {t("estimatorLink")}
        </Link>
      </p>
    </div>
  );
}
