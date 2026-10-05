import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { JsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteHeader } from "@/components/organisms/site-header";
import { SiteFooter } from "@/components/organisms/site-footer";
import { getSeoSettingsOrDefaults } from "@/lib/api/seo";
import { siteJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LOCALE_LANGUAGE_TAG, getPublicSiteUrl } from "@/lib/seo/site";
import "../globals.css";

/** فونت‌های محلی که CSP اجازهٔ preload آن‌ها را می‌دهد (``@fontsource``). */
const CRITICAL_FONT_PRELOADS = ["/fonts/vazirmatn-arabic-700.woff2"];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale: AppLocale = hasLocale(routing.locales, requested) ? requested : "fa";
  const t = await getTranslations({ locale, namespace: "metadata" });
  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = (process.env.PUBLIC_SITE_URL ?? getPublicSiteUrl()).replace(/\/+$/, "");

  // متادیتای پیش‌فرض هر زبان: canonical خودارجاع + hreflang دوزبانه + تأیید
  // Search Console + Open Graph/Twitter پویا از تنظیمات ادمین (ADR-0031).
  const base = buildPageMetadata({
    locale,
    path: "/",
    title: settings.default_meta_title || t("defaultTitle"),
    description: settings.default_meta_description || t("defaultDescription"),
    settings,
    siteUrl,
    rssPath: "/blog/rss",
  });

  return {
    ...base,
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.default_meta_title || t("defaultTitle"),
      template: `%s — ${settings.site_name || t("siteName")}`,
    },
    description: settings.default_meta_description || t("defaultDescription"),
    applicationName: settings.site_name || t("siteName"),
    alternates: {
      ...base.alternates,
      languages: {
        ...base.alternates?.languages,
        [LOCALE_LANGUAGE_TAG[locale]]: `${siteUrl}${locale === "fa" ? "/" : "/en"}`,
      },
    },
    verification: settings.search_console_verification
      ? { google: settings.search_console_verification }
      : undefined,
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  // A per-response CSP nonce requires dynamic rendering (Next.js CSP guidance).
  await connection();

  if (!hasLocale(routing.locales, requestedLocale)) {
    notFound();
  }

  const locale = requestedLocale as AppLocale;

  // فعال‌سازی رندر استاتیک برای next-intl (ر.ک. next-intl docs: setRequestLocale)
  setRequestLocale(locale);

  const direction = localeDirections[locale];
  const settings = await getSeoSettingsOrDefaults();
  const siteUrl = (process.env.PUBLIC_SITE_URL ?? getPublicSiteUrl()).replace(/\/+$/, "");
  const structuredData = siteJsonLd(settings, siteUrl, locale);
  const activeSansVariable = locale === "fa" ? "var(--font-fa)" : "var(--font-en)";
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className="antialiased"
      style={{ "--font-active-sans": activeSansVariable } as React.CSSProperties}
    >
      <head>
        {CRITICAL_FONT_PRELOADS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <JsonLd data={structuredData} />
        <NextIntlClientProvider>
          <ThemeProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              {tCommon("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
