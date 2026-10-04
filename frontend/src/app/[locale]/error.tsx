"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * خطای ۵۰۰ سفارشی سطح locale — ``error.tsx`` طبق قرارداد Next.js همیشه باید
 * Client Component باشد؛ ``useTranslations`` از NextIntlClientProvider بالادستی
 * (``[locale]/layout.tsx``) که همچنان mount است استفاده می‌کند.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-sm uppercase tracking-[0.1em] text-muted-foreground">500</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {t("serverErrorTitle")}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">{t("serverErrorDescription")}</p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" onClick={() => reset()}>
          {t("serverErrorCta")}
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">{t("notFoundCta")}</Link>
        </Button>
      </div>
    </div>
  );
}
