"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export function ComingSoon({ page, subtitle }: { page: string; subtitle: string }) {
  const t = useTranslations("ui.comingSoon");
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: "var(--deep-green-black)" }}
    >
      {/* Subtle emerald grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(31,174,110,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,174,110,0.04) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-input bg-[rgba(31,174,110,0.03)] mb-8">
          <div className="w-1 h-1 rounded-full bg-primary" />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[rgba(31,174,110,0.55)]">
            {t("pending")}
          </span>
        </div>

        <h1 className="text-5xl font-medium text-foreground mb-3 tracking-tight">{page}</h1>
        <p className="text-[rgba(243,250,246,0.38)] font-mono text-sm mb-10">{subtitle}</p>

        <div
          className="p-6 rounded-xl border border-[rgba(31,174,110,0.1)] mb-10"
          style={{ background: "rgba(11,31,24,0.5)" }}
        >
          <p className="text-sm text-[rgba(243,250,246,0.38)] leading-relaxed">{t("body")}</p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-mono text-[rgba(243,250,246,0.38)] hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
      </motion.div>
    </div>
  );
}
