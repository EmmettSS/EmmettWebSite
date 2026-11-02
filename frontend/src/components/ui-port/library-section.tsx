"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import type { HomeArticle } from "./home-data";
import { ForwardMark } from "./forward-mark";

// Visual-only palette; categories and article copy come from published records.
const categoryColors = ["#0B6B48", "#1D6FB8", "#0E7A6D", "#8A5A00", "#6C4BD8"] as const;

export function LibrarySection({ articles: items }: { articles: HomeArticle[] | null }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const t = useTranslations("ui.library");
  const common = useTranslations("common");
  const empty = useTranslations("blog");
  const articles = items ?? [];
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <section className="py-28 lg:py-36" style={{ background: "#F4F6F1" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="mb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="w-6 h-px bg-primary" />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-emerald-deep">
              {t("eyebrow")}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#102A20] leading-tight max-w-3xl"
          >
            {t("title")}
          </motion.h2>
        </div>

        {items === null ? (
          <p role="status" className="py-8 text-sm text-muted-on-light">
            {common("contentUnavailable")}
          </p>
        ) : articles.length === 0 ? (
          <p role="status" className="py-8 text-sm text-muted-on-light">
            {empty("empty")}
          </p>
        ) : (
          <>
            {featured ? (
              <motion.article
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8 p-8 rounded-2xl border border-[rgba(16,42,32,0.1)] bg-[rgba(16,42,32,0.03)] group hover:bg-[rgba(16,42,32,0.05)] transition-all duration-200"
              >
                <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {featured.category ? (
                        <span
                          className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded"
                          style={{
                            color: categoryColors[0],
                            background: `${categoryColors[0]}15`,
                          }}
                        >
                          {featured.category}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-mono text-muted-on-light tracking-widest">
                        {t("featured")}
                      </span>
                    </div>
                    <h3 className="font-editorial text-[clamp(1.5rem,3vw,2.2rem)] font-medium text-[#102A20] leading-tight mb-4">
                      <Link href={featured.href}>{featured.title}</Link>
                    </h3>
                    <p className="text-sm text-muted-on-light leading-relaxed mb-5">
                      {featured.excerpt}
                    </p>
                    <div className="flex items-center gap-4">
                      {featured.author ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[rgba(16,42,32,0.15)] flex items-center justify-center">
                            <span className="text-[8px] font-mono text-muted-on-light">
                              {featured.initials}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-muted-on-light">
                            {featured.author}
                          </span>
                        </div>
                      ) : null}
                      {featured.author && featured.date ? (
                        <span className="text-muted-on-light" aria-hidden="true">
                          ·
                        </span>
                      ) : null}
                      {featured.date ? (
                        <span className="text-xs font-mono text-muted-on-light">
                          {featured.date}
                        </span>
                      ) : null}
                      {featured.readTime ? (
                        <span className="text-xs font-mono text-muted-on-light">
                          {t("readSuffix", { time: featured.readTime })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className="hidden lg:block h-44 rounded-xl bg-[rgba(16,42,32,0.06)] border border-[rgba(16,42,32,0.08)] relative overflow-hidden"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 200 120" className="w-full h-full opacity-25">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <line
                          key={`vertical-${index}`}
                          x1={20 + index * 24}
                          y1={10}
                          x2={20 + index * 24}
                          y2={110}
                          stroke="#102A20"
                          strokeWidth="0.3"
                        />
                      ))}
                      {Array.from({ length: 6 }).map((_, index) => (
                        <line
                          key={`horizontal-${index}`}
                          x1={10}
                          y1={15 + index * 18}
                          x2={190}
                          y2={15 + index * 18}
                          stroke="#102A20"
                          strokeWidth="0.3"
                        />
                      ))}
                      <polyline
                        points="20,90 44,70 68,75 92,45 116,55 140,30 164,40 188,20"
                        fill="none"
                        className="stroke-primary"
                        strokeWidth="1.5"
                      />
                      {[20, 44, 68, 92, 116, 140, 164, 188].map((x, index) => (
                        <circle
                          key={`point-${index}`}
                          cx={x}
                          cy={[90, 70, 75, 45, 55, 30, 40, 20][index]}
                          r="2.5"
                          className="fill-primary"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              </motion.article>
            ) : null}

            <div className="space-y-0">
              {rest.map((article, index) => {
                const color = categoryColors[(index + 1) % categoryColors.length]!;
                return (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    onMouseEnter={() => setHovered(article.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="border-t border-[rgba(16,42,32,0.1)] py-5 group transition-all duration-150"
                    style={{
                      paddingInlineStart: hovered === article.id ? "12px" : "0",
                      borderInlineStart:
                        hovered === article.id
                          ? "2px solid rgba(31,174,110,0.4)"
                          : "2px solid transparent",
                    }}
                  >
                    <div className="grid lg:grid-cols-[100px_1fr_200px_120px] gap-4 items-center">
                      <span
                        className="text-[9px] font-mono tracking-widest uppercase"
                        style={{ color }}
                      >
                        {article.category}
                      </span>
                      <h3 className="text-sm font-medium text-[#102A20] group-hover:text-emerald-deep transition-colors duration-150 pe-4">
                        <Link href={article.href}>{article.title}</Link>
                      </h3>
                      <span className="text-xs font-mono text-muted-on-light hidden lg:block">
                        {article.author}
                      </span>
                      <div className="flex items-center justify-between lg:justify-end gap-4">
                        <span className="text-xs font-mono text-muted-on-light">
                          {article.readTime}
                        </span>
                        <span
                          className="text-sm text-muted-on-light group-hover:text-emerald-deep transition-colors duration-150"
                          aria-hidden="true"
                        >
                          <ForwardMark />
                        </span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}

        <div className="border-t border-[rgba(16,42,32,0.1)] pt-8 mt-0 flex items-center justify-end">
          <Link
            href="/blog"
            className="text-sm font-mono text-emerald-deep hover:text-accent transition-colors"
          >
            {t("open")} <ForwardMark />
          </Link>
        </div>
      </div>
    </section>
  );
}
