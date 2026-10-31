import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/ui-port/coming-soon";
import type { AppLocale } from "@/i18n/routing";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

/**
 * مسیر `/products/crm` — در بستهٔ UI صفحهٔ ComingSoon با همین متن است
 * (ر.ک. `UI/src/app/App.tsx`). این مسیر در پروژه معادل دیگری ندارد، پس عیناً
 * همان صفحهٔ UI ساخته شد تا لینک‌های ناوبری/پالت هیچ‌گاه 404 ندهند.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ui.comingSoon" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/products/crm",
    title: t("crmTitle"),
    description: t("crmSubtitle"),
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function CrmPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const t = await getTranslations({ locale, namespace: "ui.comingSoon" });
  return <ComingSoon page={t("crmTitle")} subtitle={t("crmSubtitle")} />;
}
