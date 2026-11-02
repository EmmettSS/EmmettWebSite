"use client";

import nextDynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { Link } from "@/i18n/navigation";

/**
 * شبکهٔ عصبی سه‌بعدی فقط سمت کلاینت و در یک chunk جداگانه بارگذاری می‌شود
 * (three.js سنگین است؛ ر.ک. `docs/ui-port-ledger.md`). زمان ظاهر شدن کنواس
 * دقیقاً مثل UI است (پس از mount کلاینت)، اما باندل اولیهٔ صفحه سنگین نمی‌شود.
 */
const NeuralNetwork3D = nextDynamic(
  () => import("./neural-network-3d").then((mod) => mod.NeuralNetwork3D),
  { ssr: false },
);

/**
 * تایمینگ‌های ورودی — همه از `src/app/globals.css` می‌آیند (کلاس‌های `hero-*`).
 *
 * چرا دیگر `motion/react` نیست؟ (ADR-0042)
 * `motion` مقدار `initial={{ opacity: 0 }}` را به‌صورت inline style در HTML
 * پخته‌شده می‌نویسد. نتیجه: `<h1 style="opacity:0">` در HTML ارسالی، و LCP
 * تا پایان hydration + فید ۷۰۰ms عقب می‌افتاد (اندازه‌گیری CI: `/en` →
 * Performance ۰٫۹۳ با LCP ۱٫۴s). انیمیشن CSS هم‌زمان با parse اجرا می‌شود،
 * پس کندی JS محتوا را پنهان نمی‌کند. متن اصلی (`h1`) عمداً **هیچ** انیمیشن
 * opacity ندارد و فقط `transform` می‌گیرد.
 */
const HERO_TIMING = {
  eyebrow: { "--hero-duration": "500ms" } as CSSProperties,
  headline: { "--hero-duration": "700ms", "--hero-delay": "80ms" } as CSSProperties,
  sub: { "--hero-duration": "600ms", "--hero-delay": "200ms" } as CSSProperties,
  cta: { "--hero-duration": "500ms", "--hero-delay": "300ms" } as CSSProperties,
  visual: { "--hero-duration": "1100ms", "--hero-delay": "50ms" } as CSSProperties,
  scrollHint: { "--hero-duration": "500ms", "--hero-delay": "1400ms" } as CSSProperties,
};

export function Hero() {
  const t = useTranslations("ui.hero");

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--deep-green-black) 0%, var(--background) 60%, var(--card) 100%)",
      }}
    >
      {/* Subtle grid — emerald tint */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(31,174,110,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,174,110,0.04) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_55%_40%,rgba(31,174,110,0.05)_0%,transparent_70%)]" />

      <div className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)]">
          {/* Left — Content */}
          <div className="flex flex-col justify-center space-y-9">
            {/* Eyebrow */}
            <div
              className="hero-enter hero-enter--fade-up flex items-center gap-3"
              style={HERO_TIMING.eyebrow}
            >
              <div className="w-6 h-px bg-primary" />
              <span className="text-[11px] font-mono tracking-[0.22em] uppercase text-primary">
                {t("eyebrow")}
              </span>
            </div>

            {/*
              Headline — کاندید LCP. عمداً فقط `transform` (بدون opacity) تا از
              نخستین رنگ‌آمیزی دیده شود. اگر روزی کسی opacity اضافه کند،
              `npm run verify:rendering` بیلد را متوقف می‌کند.
            */}
            <h1
              className="hero-enter hero-enter--rise text-[clamp(2.8rem,7vw,6.5rem)] font-medium leading-[0.95] tracking-tight text-foreground"
              style={HERO_TIMING.headline}
            >
              {t("line1")}
              <br />
              <span className="text-primary">{t("accent")}</span>
              <br />
              {t("line3")}
            </h1>

            {/* Subheading */}
            <p
              className="hero-enter hero-enter--fade text-lg text-[rgba(243,250,246,0.62)] max-w-[44ch] leading-relaxed"
              style={HERO_TIMING.sub}
            >
              {t("sub")}
            </p>

            {/* CTAs */}
            <div
              className="hero-enter hero-enter--fade-up flex flex-wrap gap-4"
              style={HERO_TIMING.cta}
            >
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-accent transition-all duration-150"
              >
                {t("explore")}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-[rgba(31,174,110,0.25)] rounded-lg text-[rgba(243,250,246,0.65)] text-sm font-mono hover:border-[rgba(31,174,110,0.5)] hover:text-foreground hover:bg-[rgba(31,174,110,0.06)] transition-all duration-150"
              >
                {t("start")}
              </Link>
            </div>
          </div>

          {/* Right — Neural Network */}
          <div
            className="hero-enter hero-enter--scale relative h-[460px] lg:h-[580px] hidden lg:block"
            style={HERO_TIMING.visual}
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-[rgba(31,174,110,0.1)] bg-[rgba(7,19,15,0.5)]">
              <NeuralNetwork3D />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07130F]/60 via-transparent to-transparent pointer-events-none" />

              {/* Technical labels floating on canvas */}
              <div className="absolute top-10 start-8 font-mono text-[10px] text-[rgba(31,174,110,0.45)] tracking-widest uppercase">
                {t("ai")}
              </div>
              <div className="absolute top-1/3 end-8 font-mono text-[10px] text-[rgba(77,155,232,0.4)] tracking-widest uppercase">
                {t("security")}
              </div>
              <div className="absolute bottom-20 start-12 font-mono text-[10px] text-[rgba(31,174,110,0.35)] tracking-widest uppercase">
                {t("backend")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        aria-hidden
        className="hero-enter hero-enter--fade absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={HERO_TIMING.scrollHint}
      >
        <div className="hero-bob w-5 h-8 rounded-full border border-[rgba(31,174,110,0.2)] flex items-start justify-center p-1.5">
          <div className="hero-dot w-0.5 h-2 rounded-full bg-[rgba(31,174,110,0.4)]" />
        </div>
        <span className="text-[10px] font-mono text-muted-on-dark tracking-widest uppercase">
          {t("scroll")}
        </span>
      </div>
    </section>
  );
}
