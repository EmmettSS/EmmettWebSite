"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
}

function buildHref(basePath: string, page: number, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (key !== "page" && value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;

  const prevHref = currentPage > 1 ? buildHref(basePath, currentPage - 1, searchParams) : null;
  const nextHref =
    currentPage < totalPages ? buildHref(basePath, currentPage + 1, searchParams) : null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let page = start; page <= end; page += 1) pages.push(page);

  return (
    <nav
      aria-label={t("label")}
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
    >
      <p className="text-sm text-muted-foreground">
        {t("pageOf", { current: currentPage, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={prevHref as "/services"}>{t("previous")}</Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            {t("previous")}
          </Button>
        )}
        <div className="flex items-center gap-1">
          {pages.map((page) => {
            const isActive = page === currentPage;
            const href = buildHref(basePath, page, searchParams);
            return isActive ? (
              <span
                key={page}
                aria-current="page"
                className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
              >
                {page}
              </span>
            ) : (
              <Link
                key={page}
                href={href as "/services"}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {page}
              </Link>
            );
          })}
        </div>
        {nextHref ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={nextHref as "/services"}>{t("next")}</Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            {t("next")}
          </Button>
        )}
      </div>
    </nav>
  );
}
