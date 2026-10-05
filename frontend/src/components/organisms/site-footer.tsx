import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const FOOTER_LINKS = ["services", "products", "projects", "library", "academy", "advisor", "estimate", "about", "contact"] as const;

export function SiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col gap-8 px-4 py-16 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold text-foreground">Emmett</span>
            <p className="max-w-sm text-sm text-muted-foreground">{t("tagline")}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item}
                href={`/${item}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {tNav(item)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Emmett. {t("rights")}
          </p>
          <p>{t("builtBy")}</p>
        </div>
      </div>
    </footer>
  );
}
