import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardMedia } from "@/components/molecules/card";
import { getCourses } from "@/lib/api/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });
  return { title: t("title"), description: t("description") };
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("academy");

  const data = await getCourses(locale);
  const courses = data?.results ?? [];

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
      </header>

      {courses.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.public_id} href={`/academy/${course.slug}`} className="block">
              <Card className="h-full overflow-hidden">
                {course.cover_image_url ? (
                  <CardMedia>
                    {/* eslint-disable-next-line @next/next/no-img-element -- دامنهٔ تصاویر از بک‌اند پویاست */}
                    <img
                      src={course.cover_image_url}
                      alt=""
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
