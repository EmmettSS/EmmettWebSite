import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusShell } from "@/components/ui-port/status-shell";

/**
 * ۴۰۴ سفارشی سطح locale. این فایل بیرون از layout گروه `(ui)` رندر می‌شود،
 * پس خودش پوستهٔ UI را می‌آورد.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <StatusShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">404</p>
      <h1 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-medium leading-[1.1] tracking-tight text-foreground">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-4 text-base text-[rgba(243,250,246,0.55)]">{t("notFoundDescription")}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t("notFoundCta")}</Link>
      </Button>
    </StatusShell>
  );
}
