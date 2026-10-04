"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * تعویض‌کنندهٔ زبان — چون فقط ۲ زبان داریم، یک جفت لینک ساده (نه select/
 * dropdown اضافه) تا در صفحه‌خوان هم کاملاً شفاف باشد. از `usePathname`
 * locale-aware استفاده می‌کند تا مسیر فعلی حفظ شود، فقط locale عوض شود.
 *
 * نکته: در فاز ۳ هیچ مسیر پویایی (`[slug]`) وجود ندارد، بنابراین نیازی به
 * پارامترهای مسیر نیست؛ وقتی فازهای بعد مسیرهای پویا اضافه کنند، این
 * کامپوننت باید با `useParams` به‌روزرسانی شود.
 */
export function LocaleSwitcher() {
  const activeLocale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("locale");

  return (
    <div role="group" aria-label={t("switchLabel")} className="flex items-center gap-1 text-sm">
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-sm px-2 py-1 font-medium transition-colors duration-fast",
              isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(locale)}
          </Link>
        );
      })}
    </div>
  );
}
