import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactForm } from "@/components/organisms/contact-form";
import { NewsletterForm } from "@/components/organisms/newsletter-form";
import type { AppLocale } from "@/i18n/routing";
import { getCatalogs } from "@/lib/api/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("description") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("contact");
  const catalogs = await getCatalogs(locale, ["project_type", "budget_range", "timeline"]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-base text-muted-foreground">{t("description")}</p>
      </header>

      <div className="mt-10">
        <ContactForm catalogs={catalogs} />
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">{t("newsletterTitle")}</h2>
        <div className="mt-4">
          <NewsletterForm />
        </div>
      </div>
    </div>
  );
}
