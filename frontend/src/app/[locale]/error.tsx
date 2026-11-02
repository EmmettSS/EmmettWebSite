"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusShell } from "@/components/ui-port/status-shell";

/**
 * خطای ۵۰۰ سفارشی سطح locale. ``error.tsx`` باید Client Component باشد و
 * بیرون از layout گروه `(ui)` رندر می‌شود، پس پوستهٔ UI را خودش می‌آورد.
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
    <StatusShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">500</p>
      <h1 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-medium leading-[1.1] tracking-tight text-foreground">
        {t("serverErrorTitle")}
      </h1>
      <p className="mt-4 text-base text-[rgba(243,250,246,0.55)]">{t("serverErrorDescription")}</p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" onClick={() => reset()}>
          {t("serverErrorCta")}
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">{t("notFoundCta")}</Link>
        </Button>
      </div>
    </StatusShell>
  );
}
