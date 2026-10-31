"use client";

import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X, Terminal, ChevronRight } from "lucide-react";

import { CommandPalette, type PaletteItem } from "./command-palette";
import { useDialogA11y } from "./dialog-a11y";
import { UiLocaleSwitch } from "./locale-switch";

/**
 * برچسب‌های ناوبری از پیام‌های دوزبانهٔ پروژه می‌آیند (namespace `nav`).
 * مقادیر زبان انگلیسی مو‌به‌مو همان رشته‌های بستهٔ UI هستند
 * (Services / Products / Projects / Library / Academy / About)، پس خروجی en
 * دقیقاً مثل UI می‌ماند؛ زبان fa برچسب فارسی می‌گیرد (نیاز دوزبانه بودن سایت).
 * Library در UI به `/library` می‌رود؛ قرارداد URL این سایت `/blog` است.
 * PenTestor و CRM مو‌به‌مو به صفحات ComingSoon خودشان می‌روند.
 */
const navLinks = [
  { key: "services", href: "/services" },
  { key: "products", href: "/products" },
  { key: "projects", href: "/projects" },
  { key: "library", href: "/blog" },
  { key: "academy", href: "/academy" },
  { key: "about", href: "/about" },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const t = useTranslations("nav");
  const ui = useTranslations("ui");
  const palette = useTranslations("ui.nav");
  const paletteItems = palette.raw("palette") as PaletteItem[];
  const pathname = usePathname();
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const menuRef = useDialogA11y(isOpen, closeMenu);

  /**
   * معادل `isActive` در `NavLink` بستهٔ UI (تطبیق مسیر دقیق یا زیرمسیر آن؛
   * مسیر بازگشتی `usePathname` برچسب locale ندارد، پس مقایسه مستقیم است).
   */
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 60);
    if (y > 400) {
      setHidden(y > lastScrollY && y > 200);
    } else {
      setHidden(false);
    }
    setLastScrollY(y);
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setIsOpen(false);
      setPaletteOpen((v) => !v);
    }
    if (e.key === "Escape") {
      setPaletteOpen(false);
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <motion.nav
        aria-label={t("landmark")}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden ? -100 : 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className={`fixed top-0 start-0 end-0 z-40 transition-all duration-200 ${
          scrolled
            ? "backdrop-blur-xl bg-[rgba(11,31,24,0.92)] border-b border-[rgba(31,174,110,0.1)]"
            : "bg-[rgba(7,19,15,0.2)]"
        }`}
        style={{ height: 64 }}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-full flex items-center justify-between gap-6">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-base tracking-[0.2em] text-foreground font-semibold">
              {ui("brand")}
            </span>
            <span className="hidden sm:inline font-mono text-[10px] tracking-widest text-muted-on-dark uppercase">
              {ui("brandGroup")}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm transition-colors duration-150 py-1 group ${
                  isActive(item.href)
                    ? "text-foreground"
                    : "text-muted-on-dark hover:text-[rgba(243,250,246,0.8)]"
                }`}
              >
                {t(item.key)}
                <span
                  className={`absolute -bottom-px start-0 h-px bg-primary transition-all duration-150 ${
                    isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <UiLocaleSwitch />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPaletteOpen(true);
              }}
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-16 focus:z-[60] focus:rounded-md focus:border focus:border-[rgba(31,174,110,0.25)] focus:bg-background focus:px-3 focus:py-1.5 focus:font-mono focus:text-xs md:hidden"
              aria-label={t("search")}
              aria-expanded={paletteOpen}
              aria-controls="command-palette"
            >
              {t("search")}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPaletteOpen(true);
              }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-[rgba(31,174,110,0.03)] text-muted-on-dark text-xs font-mono hover:border-[rgba(31,174,110,0.25)] hover:text-[rgba(243,250,246,0.8)] transition-all"
              // نام دسترس‌پذیر باید متن قابل‌مشاهده (⌘K) را دربرگیرد
              // (Lighthouse: label-content-name-mismatch).
              aria-label={`${t("search")} ⌘K`}
              aria-expanded={paletteOpen}
              aria-controls="command-palette"
            >
              <Terminal className="w-3 h-3" />
              <span>⌘K</span>
            </button>

            <Link
              href="/contact"
              className="hidden md:flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent transition-all duration-150"
            >
              {t("startProject")}
            </Link>

            <button
              type="button"
              onClick={() => {
                setPaletteOpen(false);
                setIsOpen(!isOpen);
              }}
              className="lg:hidden p-2 rounded-lg border border-input bg-[rgba(31,174,110,0.03)]"
              aria-label={isOpen ? palette("closeMenu") : palette("openMenu")}
              aria-expanded={isOpen}
              aria-controls="mobile-nav"
            >
              {isOpen ? (
                <X className="w-5 h-5 text-[rgba(243,250,246,0.6)]" />
              ) : (
                <Menu className="w-5 h-5 text-[rgba(243,250,246,0.6)]" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      {isOpen && (
        <motion.div
          ref={menuRef}
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 pt-16 backdrop-blur-xl lg:hidden"
          style={{ background: "rgba(7,19,15,0.98)" }}
        >
          <div className="px-6 py-8 space-y-0.5">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between h-14 border-b border-[rgba(31,174,110,0.08)] text-lg transition-colors ${
                  isActive(item.href) ? "text-foreground" : "text-[rgba(243,250,246,0.48)]"
                }`}
              >
                {t(item.key)}
                <ChevronRight className="w-4 h-4 opacity-20 rtl:-scale-x-100" />
              </Link>
            ))}
            <div className="pt-8">
              <Link
                href="/contact"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              >
                {t("startProject")}
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      <CommandPalette open={paletteOpen} onClose={closePalette} items={paletteItems} />
    </>
  );
}
