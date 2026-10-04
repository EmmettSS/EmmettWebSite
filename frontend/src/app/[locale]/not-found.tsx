import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * ۴۰۴ سفارشی سطح locale — وقتی ``notFound()`` در هر صفحهٔ زیر ``[locale]``
 * صدا زده شود (مثلاً slug نامعتبر)، Next این فایل را به‌جای صفحهٔ پیش‌فرض
 * رندر می‌کند، همچنان داخل layout با SiteHeader/SiteFooter.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-sm uppercase tracking-[0.1em] text-muted-foreground">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">{t("notFoundDescription")}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t("notFoundCta")}</Link>
      </Button>
    </div>
  );
}
