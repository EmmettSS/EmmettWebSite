import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/molecules/card";
import { getServices } from "@/lib/api/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return { title: t("title"), description: t("description") };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("services");

  const data = await getServices(locale);
  const services = data?.results ?? [];

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
      </header>

      {services.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      )}
    </div>
  );
}
