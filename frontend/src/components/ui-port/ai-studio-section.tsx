"use client";

import { Lightbulb, Timer, ArrowUpRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AiStudioSection() {
  const t = useTranslations("ui.aiStudio");

  const cards = [
    {
      id: "advisor",
      href: "/advisor" as const,
      icon: Lightbulb,
      eyebrow: t("advisorEyebrow"),
      title: t("advisorTitle"),
      lead: t("advisorLead"),
      cta: t("advisorCta"),
      accent: "emerald" as const,
    },
    {
      id: "estimator",
      href: "/estimate" as const,
      icon: Timer,
      eyebrow: t("estimatorEyebrow"),
      title: t("estimatorTitle"),
      lead: t("estimatorLead"),
      cta: t("estimatorCta"),
      accent: "blue" as const,
    },
  ] as const;

  return (
    <section
      id="ai-studio"
      aria-labelledby="ai-studio-heading"
      className="relative overflow-hidden bg-deep-green-black py-28 lg:py-36"
    >
      {/* پس‌زمینه: گرادینت زمردی ملایم + شبکه */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--primary) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--primary) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "3.5rem 3.5rem",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 10%, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3"
          >
            <div className="h-px w-6 bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              {t("eyebrow")}
            </span>
            <div className="h-px w-6 bg-primary" />
          </motion.div>

          <motion.h2
            id="ai-studio-heading"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-medium leading-[0.98] tracking-tight text-foreground"
          >
            {t("title")}
            <br />
            <span className="text-primary">{t("titleAccent")}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-muted-on-dark"
          >
            {t("lead")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="mx-auto mt-3 flex items-center justify-center gap-2 text-xs leading-5 text-muted-on-dark"
          >
            <Sparkles aria-hidden className="size-3 text-primary" />
            {t("privacyNote")}
          </motion.p>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-primary/14 bg-foreground/[0.03] p-7 text-start backdrop-blur-sm transition-colors hover:border-primary/28 hover:bg-primary/6 lg:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-primary/9 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-on-dark">
                    {card.eyebrow}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                  <Link
                    href={card.href}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green-black"
                  >
                    {card.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-on-dark">{card.lead}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {t.raw(`bullets.${card.id}` as never) instanceof Array
                    ? (t.raw(`bullets.${card.id}` as never) as string[]).map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-full border border-primary/14 bg-primary/6 px-3 py-1 font-mono text-[10px] tracking-widest text-foreground/75"
                        >
                          {bullet}
                        </li>
                      ))
                    : null}
                </ul>

                <div className="mt-7 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-primary transition-colors group-hover:text-accent">
                  {card.cta}
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100"
                  />
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* SEO helper links — visible but secondary */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18 }}
          className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-3 text-xs"
        >
          <span className="font-mono tracking-widest text-muted-on-dark">{t("alsoSee")}</span>
          <Link
            href="/search"
            className="rounded-full border border-foreground/14 px-3 py-1 text-foreground/70 hover:border-primary hover:text-foreground"
          >
            {t("searchLink")}
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-foreground/14 px-3 py-1 text-foreground/70 hover:border-primary hover:text-foreground"
          >
            {t("contactLink")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
