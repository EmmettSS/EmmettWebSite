import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/molecules/fade-in";

/**
 * بخش Hero — طبق «D1. Hero» سند مشخصات طراحی: پس‌زمینهٔ Obsidian همیشه
 * تیره (مستقل از تم روشن/تاریک کاربر — این یک انتخاب ادیتوریال ثابت برند
 * است، نه حالت UI؛ ر.ک. ADR-0017)، چیدمان نامتقارن ۷/۵، آغاز با eyebrow،
 * سپس headline (h1 واقعی)، سپس توضیح، سپس دو CTA.
 */
export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden bg-surface-obsidian text-[#F2F1EE]">
      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col gap-10 px-4 py-24 sm:px-6 md:min-h-[85vh] md:flex-row md:items-center md:py-32 lg:px-10">
        <FadeIn on="mount" className="flex flex-col gap-6 md:basis-7/12">
          <span className="font-technical text-xs uppercase tracking-[0.08em] text-[#A7A9AE]">
            {t("eyebrow")}
          </span>

          <h1 className="text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t("headline")}
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-[#A7A9AE]">{t("subtext")}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/projects">{t("primaryCta")}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-[#F2F1EE] hover:text-white">
              <Link href="/contact">{t("secondaryCta")}</Link>
            </Button>
          </div>
        </FadeIn>

        <FadeIn on="mount" delay={0.4} className="md:basis-5/12">
          <div
            role="img"
            aria-label="نمودار تصویری معماری سیستم (Hero)"
            className="aspect-square w-full rounded-lg border border-[#2E3034] bg-surface-graphite"
          />
        </FadeIn>
      </div>
    </section>
  );
}
