import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";

import { Link } from "@/i18n/navigation";
import { localeDirections, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * مسیر ناوبری — جهت پیکان بسته به RTL/LTR عوض می‌شود (قانون ۱۱: تصمیم در
 * سطح کامپوننت، نه با CSS transform سراسری).
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const locale = useLocale() as AppLocale;
  const isRtl = localeDirections[locale] === "rtl";
  const SeparatorIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link href={item.href} className="transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined} className="text-foreground">
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? <SeparatorIcon aria-hidden="true" className="size-3.5" /> : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
