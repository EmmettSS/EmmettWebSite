import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";
import { getService } from "@/lib/api/server";

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
  return {
    title: service.meta_title || service.title,
    description: service.meta_description || service.summary,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("services");

  const service = await getService(locale, slug);
  if (!service) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <Breadcrumb
        items={[
          { label: t("title"), href: "/services" },
          { label: service.title },
        ]}
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
