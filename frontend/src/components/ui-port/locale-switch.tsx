"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * تعویض زبان داخل پوستهٔ UI. مسیر فعلی حفظ می‌شود؛ فقط locale عوض می‌شود
 * تا هم `dir` صفحه و هم `Accept-Language` درخواست بعدی API عوض شود.
 */
export function UiLocaleSwitch() {
  const active = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("locale");

  return (
    <div role="group" aria-label={t("switchLabel")} className="flex items-center gap-1.5">
      {routing.locales.map((locale, index) => {
        const isActive = locale === active;
        return (
          <span key={locale} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span aria-hidden className="text-[rgba(243,250,246,0.18)]">
                /
              </span>
            ) : null}
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              aria-current={isActive ? "true" : undefined}
              className={`font-mono text-[10px] tracking-widest uppercase transition-colors ${
                isActive ? "text-primary" : "text-muted-on-dark hover:text-foreground"
              }`}
            >
              {locale === "fa" ? t("shortFa") : t("shortEn")}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
