"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import type { HomeProduct } from "./home-data";
import { ForwardMark } from "./forward-mark";

// Visual-only card treatments; content and links always come from published records.
const productPalettes = [
  { from: "var(--deep-green-black)", to: "var(--card)" },
  { from: "var(--background)", to: "var(--secondary)" },
  { from: "var(--card)", to: "var(--background)" },
] as const;

export function ProductsSection({ products: items }: { products: HomeProduct[] | null }) {
  const t = useTranslations("ui.products");
  const common = useTranslations("common");
  const empty = useTranslations("projects");
  const products = items ?? [];

  return (
    <section className="py-28 lg:py-36" style={{ background: "var(--background)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="w-6 h-px bg-primary" />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
              {t("eyebrow")}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-foreground leading-tight max-w-2xl"
          >
            {t("title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="mt-4 text-base text-muted-on-dark max-w-[52ch] leading-relaxed"
          >
            {t("lead")}
          </motion.p>
        </div>

        {items === null ? (
          <p role="status" className="py-8 text-sm text-muted-on-dark">
            {common("contentUnavailable")}
          </p>
        ) : products.length === 0 ? (
          <p role="status" className="py-8 text-sm text-muted-on-dark">
            {empty("empty")}
          </p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const palette = productPalettes[index % productPalettes.length]!;
              const highlights = product.metrics.slice(0, 3);
              const tags = [...new Set([...product.tags, ...product.technologyStack])].slice(0, 8);

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="flex flex-col rounded-2xl overflow-hidden border border-[rgba(31,174,110,0.1)] hover:border-[rgba(31,174,110,0.25)] transition-all duration-300"
                  style={{
                    background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
                  }}
                >
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-[10px] font-mono text-muted-on-dark tracking-widest">
                        {product.num}
                      </span>
                      {product.year ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[rgba(31,174,110,0.2)] text-[rgba(31,174,110,0.6)] tracking-wider">
                          {product.year}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{product.name}</h3>
                    <p className="text-sm text-muted-on-dark leading-relaxed">{product.copy}</p>
                  </div>

                  {highlights.length > 0 ? (
                    <dl className="px-6 py-3 flex-1 space-y-2">
                      {highlights.map((metric) => (
                        <div
                          key={metric.label}
                          className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg bg-[rgba(16,42,32,0.4)] border border-[rgba(31,174,110,0.06)]"
                        >
                          <dt className="text-[10px] font-mono text-muted-on-dark">
                            {metric.label}
                          </dt>
                          <dd className="text-[10px] font-mono font-semibold text-primary text-end">
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : product.technologyStack.length > 0 ? (
                    <div className="px-6 py-3 flex-1 flex flex-wrap content-start gap-1.5">
                      {product.technologyStack.slice(0, 8).map((technology) => (
                        <span
                          key={technology}
                          className="text-[9px] font-mono tracking-wider px-2 py-1 rounded bg-[rgba(31,174,110,0.06)] border border-input text-[rgba(31,174,110,0.65)]"
                        >
                          {technology}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-3 flex-1" aria-hidden="true" />
                  )}

                  <div className="p-6 pt-4 border-t border-[rgba(31,174,110,0.08)]">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-[rgba(31,174,110,0.06)] border border-input text-[rgba(31,174,110,0.55)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <Link
                      href={product.href}
                      className="group inline-flex items-center gap-2 text-sm font-mono text-primary hover:text-accent transition-colors"
                    >
                      {t("view")}
                      <ForwardMark />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link
            href="/products"
            className="text-sm font-mono text-muted-on-dark hover:text-[rgba(243,250,246,0.65)] transition-colors"
          >
            {t("seeAll")} <ForwardMark />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
