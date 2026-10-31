import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreativeAdvisorForm } from "@/components/organisms/creative-advisor-form";
import { Link } from "@/i18n/navigation";
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
    <div className={frameWidth.reading}>
      <header className="max-w-2xl">
        <PageEyebrow>{t("eyebrow")}</PageEyebrow>
        <h1 className={pageTitleClass}>{t("advisorTitle")}</h1>
        <p className={pageLeadClass}>{t("advisorDescription")}</p>
      </header>

      <section className={`mt-10 ${panelClass}`}>
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
