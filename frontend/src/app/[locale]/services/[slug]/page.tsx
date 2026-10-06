import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";
import { getService } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/json-ld";
import { getFaqForPath } from "@/lib/api/seo";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/lib/seo/json-ld";

interface PageParams {
  locale: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await getService(locale, slug);
  if (!service) return {};
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: `/services/${slug}`,
    title: service.meta_title || service.title,
    description: service.meta_description || service.summary,
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function ServiceDetailPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("services");

  const service = await getService(locale, slug);
  if (!service) notFound();

  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = getPublicSiteUrl();
  const appLocale = toAppLocale(locale);
  const crumbs = [
    { name: t("title"), path: "/services" },
    { name: service.title, path: `/services/${slug}` },
  ];
  const faqItems = await getFaqForPath(`/services/${slug}`, locale);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <JsonLd
        data={serviceJsonLd(
          { name: service.title, description: service.summary, path: `/services/${slug}` },
          settings,
          siteUrl,
          appLocale,
        )}
      />
      <JsonLd data={breadcrumbJsonLd(crumbs, siteUrl, appLocale)} />
      <JsonLd data={faqJsonLd(faqItems)} />
      <Breadcrumb
        items={[{ label: t("title"), href: "/services" }, { label: service.title }]}
        className="mb-8"
      />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {service.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{service.summary}</p>

        {service.categories.length > 0 || service.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {service.categories.map((category) => (
              <Badge key={category.slug} variant="outline">
                {category.name}
              </Badge>
            ))}
            {service.tags.map((tag) => (
              <Badge key={tag.slug} variant="neutral">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <div
        className="markdown-content mt-10"
        // محتوا توسط nh3 در بک‌اند sanitize شده (ADR-0022/قانون ۱۶)
        dangerouslySetInnerHTML={{ __html: service.description_html }}
      />
    </article>
  );
}
