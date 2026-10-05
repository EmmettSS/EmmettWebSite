import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/molecules/card";
import type { AppLocale } from "@/i18n/routing";
import { getTeamMembers, getTestimonials } from "@/lib/api/server";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteUrl, toAppLocale } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "team" });
  const settings = await getSeoSettingsOrDefaults();
  return buildPageMetadata({
    locale: toAppLocale(locale),
    path: "/about",
    title: t("title"),
    description: t("description"),
    settings,
    siteUrl: getPublicSiteUrl(),
    
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("team");

  const [teamData, testimonialsData] = await Promise.all([
    getTeamMembers(locale),
    getTestimonials(locale),
  ]);
  const team = teamData?.results ?? [];
  const testimonials = testimonialsData?.results ?? [];

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
      </header>

      {team.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">{t("teamHeading")}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div key={member.public_id} className="flex flex-col items-start gap-3">
                <Avatar className="size-16">
                  {member.photo_url ? (
                    <AvatarImage src={member.photo_url} alt={member.full_name} />
                  ) : null}
                  <AvatarFallback>{member.full_name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">{member.role_title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-xl font-semibold text-foreground">{t("testimonialsHeading")}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader>
                  <CardDescription className="text-base text-foreground">
                    “{testimonial.quote}”
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {testimonial.author_photo_url ? (
                        <AvatarImage
                          src={testimonial.author_photo_url}
                          alt={testimonial.author_name}
                        />
                      ) : null}
                      <AvatarFallback>{testimonial.author_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">{testimonial.author_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.author_role}
                        {testimonial.author_company ? ` · ${testimonial.author_company}` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
