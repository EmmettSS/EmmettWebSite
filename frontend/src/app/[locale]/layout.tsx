import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteHeader } from "@/components/organisms/site-header";
import { SiteFooter } from "@/components/organisms/site-footer";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: {
      default: t("defaultTitle"),
      template: `%s — ${t("siteName")}`,
    },
    description: t("defaultDescription"),
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
      <body className="flex min-h-screen flex-col bg-background text-foreground">
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
