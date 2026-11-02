import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardMedia,
} from "@/components/molecules/card";
import { getCourses } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";
import {
  FeedLink,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
} from "@/components/ui-port/page-frame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/academy",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
    rssPath: "/academy/rss",
  });
}

export default async function AcademyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("academy");

  const data = await getCourses(locale);
  const courses = data?.results ?? [];

  return (
    <div className={frameWidth.wide}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className={pageTitleClass}>{t("title")}</h1>
          <p className={pageLeadClass}>{t("description")}</p>
        </div>
        {/* مسیر فید یک Route Handler است (خروجی XML)؛ لینک ساده کافی است و
            از ``<link rel="alternate">`` متادیتا هم کشف می‌شود. */}
        <FeedLink href={locale === "fa" ? "/academy/rss" : "/en/academy/rss"}>
          {t("rssFeed")}
        </FeedLink>
      </header>

      {courses.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.public_id} href={`/academy/${course.slug}`} className="block">
              <Card className="h-full overflow-hidden">
                {course.cover_image_url ? (
                  <CardMedia>
                    <Image
                      src={course.cover_image_url}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="aspect-video w-full object-cover"
                    />
                  </CardMedia>
                ) : null}
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="technical">{t(`levels.${course.level}`)}</Badge>
                    {course.is_featured ? <Badge variant="accent">★</Badge> : null}
                  </div>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>{course.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
