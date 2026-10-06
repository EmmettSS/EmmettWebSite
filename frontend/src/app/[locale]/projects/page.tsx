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
import { getProjects } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";
import Image from "next/image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/projects",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
  });
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("projects");

  const data = await getProjects(locale);
  const projects = data?.results ?? [];

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
      </header>

      {projects.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.public_id} href={`/projects/${project.slug}`} className="block">
              <Card className="h-full overflow-hidden">
                {project.cover_image_url ? (
                  <CardMedia>
                    <Image
                      src={project.cover_image_url}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="aspect-video w-full object-cover"
                    />
                  </CardMedia>
                ) : null}
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {project.is_product ? <Badge variant="accent">{t("products")}</Badge> : null}
                    {project.year ? <Badge variant="technical">{project.year}</Badge> : null}
                  </div>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>{project.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
