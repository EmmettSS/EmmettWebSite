import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";
import { getProject } from "@/lib/api/server";
import { sanitizeRichHtml } from "@/lib/security/sanitize-rich-html";
import { JsonLd } from "@/components/seo/json-ld";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";
import {
  frameWidth,
  pageSummaryClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui-port/page-frame";

interface PageParams {
  locale: string;
  slug: string;
}

/**
 * مسیر واقعی این صفحه — **همیشه** `/projects/{slug}`، حتی وقتی
 * `project.is_product` true باشد (ADR-0040).
 *
 * به‌صورت یک تابع سطح ماژول نوشته شده تا `generateMetadata` و بدنهٔ صفحه هر دو
 * از یک منبع بخوانند؛ اگر هر کدام جداگانه قالب مسیر را می‌ساختند، واگرایی
 * دوبارهٔ canonical و نانبرد/JSON-LD ممکن می‌شد — همان کلاسی از باگ که این
 * بسته اصلاحش کرد.
 *
 * چرا `/projects/` و نه `/products/`؟ سه واقعیت اندازه‌گیری‌شده:
 * ۱) `/products/{slug}` در این برنامه صفحهٔ ComingSoonِ پورت UI است
 *    (`(ui)/products/{pentestor,crm}/page.tsx`) و `ui-port.spec.ts` قرارداد
 *    کرده canonical خودش را داشته باشد — پس صفحهٔ محتوای واقعی را نمی‌توان به
 *    آن ارجاع داد.
 * ۲) فهرست محصولات (`(pages)/products/page.tsx`) و کارت‌های زندهٔ صفحهٔ اصلی
 *    (`home-data.ts`) هر محصول را به `/projects/{slug}` لینک می‌کنند.
 * ۳) بک‌اند در `apps/core/seo.py::_published_entries` برای همهٔ پروژه‌ها
 *    `/projects/{slug}` را در sitemap می‌فرستد.
 */
function projectDetailPath(slug: string): string {
  return `/projects/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProject(locale, slug);
  if (!project) return {};
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    // این `path` در `buildPageMetadata` هم‌زمان canonical، `og:url` و هر سه
    // hreflang را می‌سازد؛ دلیلِ همیشه `/projects/` بودن در docstringِ
    // `projectDetailPath` ثبت شده است (ADR-0040).
    path: projectDetailPath(slug),
    title: project.meta_title || project.title,
    description: project.meta_description || project.summary,
    imageUrl: project.cover_image_url,
    settings,
    siteUrl: getPublicSiteUrl(),
    type: "article",
  });
}

export default async function ProjectDetailPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("projects");

  const project = await getProject(locale, slug);
  if (!project) notFound();

  // والدِ نانبرد برای یک محصول، فهرست محصولات است (والدِ معناییِ درست)؛ ولی
  // خودِ آیتم باید URL واقعیِ صفحه باشد. پیش از این هر دو از `listHref` ساخته
  // می‌شدند، پس نانبرد و JSON-LD به صفحهٔ «به‌زودی» اشاره می‌کردند (ADR-0040).
  const listHref = project.is_product ? "/products" : "/projects";
  const listLabel = project.is_product ? t("products") : t("title");
  const detailPath = projectDetailPath(slug);

  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = getPublicSiteUrl();
  const appLocale = toAppLocale(locale);
  const crumbs = [
    { name: listLabel, path: listHref },
    { name: project.title, path: detailPath },
  ];

  return (
    <article className={frameWidth.reading}>
      <JsonLd
        data={articleJsonLd(
          {
            title: project.title,
            description: project.summary,
            path: detailPath,
            imageUrl: project.cover_image_url,
            publishedAt: null,
            authorName: null,
            section: listLabel,
            tags: project.tags.map((tag) => tag.name),
          },
          settings,
          siteUrl,
          appLocale,
        )}
      />
      <JsonLd data={breadcrumbJsonLd(crumbs, siteUrl, appLocale)} />
      <Breadcrumb
        items={[{ label: listLabel, href: listHref }, { label: project.title }]}
        className="mb-8"
      />

      <header>
        <h1 className={pageTitleClass}>{project.title}</h1>
        <p className={pageSummaryClass}>{project.summary}</p>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {project.client_name ? (
            <div>
              <dt className="text-muted-foreground">{t("client")}</dt>
              <dd className="font-medium text-foreground">{project.client_name}</dd>
            </div>
          ) : null}
          {project.year ? (
            <div>
              <dt className="text-muted-foreground">{t("year")}</dt>
              <dd className="font-medium text-foreground">{project.year}</dd>
            </div>
          ) : null}
        </dl>

        {project.categories.length > 0 || project.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.categories.map((category) => (
              <Badge key={category.slug} variant="outline">
                {category.name}
              </Badge>
            ))}
            {project.tags.map((tag) => (
              <Badge key={tag.slug} variant="neutral">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {project.cover_image_url ? (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={project.cover_image_url}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      {project.gallery_urls.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {project.gallery_urls.map((url) => (
            <div key={url} className="relative aspect-video overflow-hidden rounded-lg">
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      {project.case_study ? (
        <div className="mt-10 space-y-10">
          {project.case_study.challenge_html ? (
            <section>
              <h2 className={sectionTitleClass}>{t("challenge")}</h2>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(project.case_study.challenge_html),
                }}
              />
            </section>
          ) : null}

          {project.case_study.approach_html ? (
            <section>
              <h2 className={sectionTitleClass}>{t("approach")}</h2>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(project.case_study.approach_html),
                }}
              />
            </section>
          ) : null}

          {project.case_study.technology_stack.length > 0 ? (
            <section>
              <h2 className={sectionTitleClass}>{t("technologyStack")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.case_study.technology_stack.map((technology) => (
                  <Badge key={technology} variant="technical">
                    {technology}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {project.case_study.architecture_notes_html ? (
            <section>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(project.case_study.architecture_notes_html),
                }}
              />
            </section>
          ) : null}

          {project.case_study.implementation_notes_html ? (
            <section>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(project.case_study.implementation_notes_html),
                }}
              />
            </section>
          ) : null}

          {project.case_study.result_html ? (
            <section>
              <h2 className={sectionTitleClass}>{t("result")}</h2>
              <div
                className="markdown-content mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(project.case_study.result_html),
                }}
              />
            </section>
          ) : null}

          {Object.keys(project.case_study.metrics).length > 0 ? (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Object.entries(project.case_study.metrics).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-4">
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
