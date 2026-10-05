import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnrollButton } from "@/components/organisms/enroll-button";
import type { AppLocale } from "@/i18n/routing";
import { getCourse } from "@/lib/api/server";
import { JsonLd } from "@/components/seo/json-ld";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

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
  const course = await getCourse(locale, slug);
  if (!course) return {};
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: `/academy/${slug}`,
    title: course.meta_title || course.title,
    description: course.meta_description || course.summary,
    imageUrl: course.cover_image_url,
    settings,
    siteUrl: getPublicSiteUrl(),
    rssPath: "/academy/rss",
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("academy");

  const course = await getCourse(locale, slug);
  if (!course) notFound();

  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = getPublicSiteUrl();
  const appLocale = toAppLocale(locale);
  const crumbs = [
    { name: t("title"), path: "/academy" },
    { name: course.title, path: `/academy/${slug}` },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <JsonLd
        data={courseJsonLd(
          {
            name: course.title,
            description: course.summary,
            path: `/academy/${slug}`,
            imageUrl: course.cover_image_url,
            level: t(`levels.${course.level}`),
            durationHours: Number(course.duration_hours) || 0,
            instructorName: course.instructor?.name ?? null,
          },
          settings,
          siteUrl,
          appLocale,
        )}
      />
      <JsonLd data={breadcrumbJsonLd(crumbs, siteUrl, appLocale)} />
      <Breadcrumb
        items={[{ label: t("title"), href: "/academy" }, { label: course.title }]}
        className="mb-8"
      />

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="technical">{t(`levels.${course.level}`)}</Badge>
          {course.duration_hours ? (
            <Badge variant="outline">
              {course.duration_hours} {t("hours")}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{course.summary}</p>

        {course.instructor ? (
          <div className="mt-5 flex items-center gap-3">
            <Avatar>
              {course.instructor.photo_url ? (
                <AvatarImage src={course.instructor.photo_url} alt={course.instructor.name} />
              ) : null}
              <AvatarFallback>{course.instructor.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{course.instructor.name}</p>
              <p className="text-xs text-muted-foreground">{course.instructor.title}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <EnrollButton courseSlug={course.slug} />
        </div>
      </header>

      <div
        className="markdown-content mt-10"
        dangerouslySetInnerHTML={{ __html: course.description_html }}
      />

      {course.lessons.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">
            {t("curriculum")}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({course.lessons.length} {t("lessons")})
            </span>
          </h2>
          <ol className="mt-4 divide-y divide-border rounded-lg border border-border">
            {course.lessons.map((lesson, index) => (
              <li key={lesson.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                    {lesson.summary ? (
                      <p className="text-xs text-muted-foreground">{lesson.summary}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.is_preview ? <Badge variant="accent">{t("preview")}</Badge> : null}
                  {lesson.duration_minutes ? (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {lesson.duration_minutes} {t("minutes")}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
