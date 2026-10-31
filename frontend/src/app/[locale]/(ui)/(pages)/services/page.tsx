import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/molecules/card";
import { getServices } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";

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

  const data = await getServices(locale);
  const services = data?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="max-w-2xl">
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      {services.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          {/* سرفصل سطح ۲ برای فهرست: عنوان کارت‌ها h3 است و بدون این پل،
              ترتیب سرفصل از h1 مستقیم به h3 می‌پرد (Lighthouse: heading-order).
              از نظر بصری همان چیدمان قبلی است (sr-only). */}
          <h2 className="sr-only">{t("listHeading")}</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.public_id} href={`/services/${service.slug}`} className="block">
                <Card className="h-full">
                  <CardHeader>
                    {service.is_featured ? <Badge variant="accent">★</Badge> : null}
                    <CardTitle>{service.title}</CardTitle>
                    <CardDescription>{service.summary}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
