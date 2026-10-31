import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfileView } from "@/components/organisms/profile-view";
import type { AppLocale } from "@/i18n/routing";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageTitleClass, panelClass } from "@/components/ui-port/page-frame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/profile",
    title: t("title"),
    settings,
    siteUrl: getPublicSiteUrl(),
    noindex: true,
  });
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("profile");

  return (
    <div className={frameWidth.narrow}>
      <h1 className={pageTitleClass}>{t("title")}</h1>
      <div className={`mt-10 ${panelClass}`}>
        <ProfileView />
      </div>
    </div>
  );
}
