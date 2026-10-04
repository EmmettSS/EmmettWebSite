"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/molecules/locale-switcher";
import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  "home",
  "services",
  "products",
  "projects",
  "library",
  "academy",
  "about",
] as const;

/**
 * هدر سایت — طبق «Navigation Bar» سند مشخصات طراحی: شفاف روی Hero، هنگام
 * اسکرول (~80px) به حالت تیره+بلور+hairline تبدیل می‌شود (۲۰۰ms ease-out)؛
 * زیر ۱۰۲۴px به منوی کشویی تمام‌صفحه تبدیل می‌شود.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-base",
        isScrolled
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-(--breakpoint-xl) items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
          Emmett
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              href={item === "home" ? "/" : `/${item}`}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t(item)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/contact">{tCommon("startProject")}</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          aria-label={isMenuOpen ? t("closeMenu") : t("openMenu")}
          className="inline-flex size-11 items-center justify-center rounded-sm text-foreground md:hidden"
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {isMenuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="flex flex-col gap-1 border-t border-border bg-background px-4 py-4 md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              href={item === "home" ? "/" : `/${item}`}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-sm px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {t(item)}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
