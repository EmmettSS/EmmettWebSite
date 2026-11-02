import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AdvisorLeadForm } from "@/components/organisms/advisor-lead-form";
import { ShareResultButton } from "@/components/organisms/share-result-button";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format/number";
import { extractForwardedClientIp, getCatalogs, getSharedAISuggestion } from "@/lib/api/server";
import {
  PageEyebrow,
  frameWidth,
  pageLeadClass,
  pageTitleClass,
  panelClass,
} from "@/components/ui-port/page-frame";

interface PageParams {
  locale: string;
  token: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ai" });
  return {
    title: t("sharedResultTitle"),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function SharedAdvisorResultPage({ params }: { params: Promise<PageParams> }) {
  const { locale, token } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("ai");
  const clientIp = extractForwardedClientIp(await headers());
  const [suggestion, catalogs] = await Promise.all([
    getSharedAISuggestion(locale, token, clientIp),
    getCatalogs(locale, ["project_type", "budget_range", "timeline"]),
  ]);
  if (!suggestion) notFound();

  return (
    <div className={frameWidth.results}>
      <header className="max-w-2xl">
        <PageEyebrow>{t("eyebrow")}</PageEyebrow>
        <h1 className={pageTitleClass}>{t("sharedResultTitle")}</h1>
        <p className={pageLeadClass}>{t("preliminaryDisclaimer")}</p>
      </header>

      <ShareResultButton />

      <ol className="mt-10 flex flex-col gap-6">
        {suggestion.concepts.map((concept) => (
          <li key={concept.public_id} className={panelClass}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {t("conceptNumber", {
                  number: formatNumber(concept.position, locale as AppLocale),
                })}
              </Badge>
              <Badge variant="neutral">{concept.solution_area.label}</Badge>
              <Badge variant="neutral">{concept.complexity.label}</Badge>
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
              {concept.title}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">{concept.description}</p>
            <p className="mt-4 rounded-lg bg-secondary/30 p-4 text-sm leading-6 text-foreground">
              <span className="font-semibold">{t("benefitLabel")}: </span>
              {concept.benefit}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>
                {t("deliveryScopeLabel")}: {concept.delivery_scope.label}
              </span>
              {concept.minimum_working_days !== null ? (
                <span>
                  {t("minimumDays", {
                    days: formatNumber(concept.minimum_working_days, locale as AppLocale),
                  })}
                </span>
              ) : null}
              {concept.related_item ? (
                <Link
                  href={
                    concept.related_item.type === "service"
                      ? `/services/${concept.related_item.slug}`
                      : `/projects/${concept.related_item.slug}`
                  }
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {t("relatedExisting", { title: concept.related_item.title })}
                </Link>
              ) : null}
            </div>
            <AdvisorLeadForm token={token} concept={concept} catalogs={catalogs} />
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/advisor" className="font-medium text-primary underline underline-offset-4">
          {t("startAgain")}
        </Link>
      </p>
    </div>
  );
}
