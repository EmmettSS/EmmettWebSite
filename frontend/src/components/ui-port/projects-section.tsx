"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import type { HomeProject } from "./home-data";
import { ForwardMark } from "./forward-mark";

export function ProjectsSection({
  projects: items,
  total,
}: {
  projects: HomeProject[] | null;
  total: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const t = useTranslations("ui.projects");
  const common = useTranslations("common");
  const empty = useTranslations("projects");
  const projects = items ?? [];

  return (
    <section className="py-28 lg:py-36" style={{ background: "#DDEDE5" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="mb-16 grid lg:grid-cols-[1fr_1fr] gap-8 items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="w-6 h-px bg-emerald-deep" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-emerald-deep">
                {t("eyebrow")}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#102A20] leading-tight"
            >
              {t("title")}
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-muted-on-light leading-relaxed max-w-[40ch] lg:text-end lg:ms-auto"
          >
            {t("lead")}
          </motion.p>
        </div>

        {items === null ? (
          <p role="status" className="py-8 text-sm text-muted-on-light">
            {common("contentUnavailable")}
          </p>
        ) : projects.length === 0 ? (
          <p role="status" className="py-8 text-sm text-muted-on-light">
            {empty("empty")}
          </p>
        ) : (
          <div className="space-y-0">
            {projects.map((project, index) => {
              const tags = [...new Set([...project.tags, ...project.technologyStack])];
              return (
                <motion.article
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07 }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  className="border-t border-[rgba(16,42,32,0.12)] py-8 group cursor-default"
                >
                  <div
                    className={`grid gap-6 items-start ${
                      project.metrics.length > 0
                        ? "lg:grid-cols-[80px_1fr_280px]"
                        : "lg:grid-cols-[80px_1fr]"
                    }`}
                  >
                    <div className="pt-1">
                      <span
                        aria-hidden="true"
                        className="text-[clamp(1.8rem,4vw,3rem)] font-mono font-bold text-[rgba(16,42,32,0.12)] leading-none select-none"
                      >
                        {project.num}
                      </span>
                    </div>

                    <div>
                      {project.industry || project.year ? (
                        <div className="flex items-center gap-3 mb-3">
                          {project.industry ? (
                            <span className="text-[10px] font-mono tracking-widest uppercase text-muted-on-light">
                              {project.industry}
                            </span>
                          ) : null}
                          {project.industry && project.year ? (
                            <span className="text-muted-on-light text-sm" aria-hidden="true">
                              ·
                            </span>
                          ) : null}
                          {project.year ? (
                            <span className="text-[10px] font-mono text-muted-on-light">
                              {project.year}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <h3
                        className="text-xl lg:text-2xl font-semibold text-[#102A20] mb-3 transition-colors duration-200"
                        style={{ color: hovered === index ? "var(--emerald-deep)" : "#102A20" }}
                      >
                        <Link href={project.href}>{project.title}</Link>
                      </h3>
                      <p className="text-sm text-muted-on-light leading-relaxed max-w-[52ch] mb-4">
                        {project.description}
                      </p>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border border-[rgba(16,42,32,0.15)] text-muted-on-light bg-[rgba(16,42,32,0.04)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {project.metrics.length > 0 ? (
                      <div className="lg:text-end">
                        <div className="inline-block text-start lg:text-end">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-muted-on-light block mb-2">
                            {t("outcome")}
                          </span>
                          <dl className="space-y-2">
                            {project.metrics.slice(0, 2).map((metric) => (
                              <div key={metric.label}>
                                <dt className="text-[10px] font-mono text-muted-on-light">
                                  {metric.label}
                                </dt>
                                <dd
                                  className="text-sm font-mono font-semibold transition-colors duration-200"
                                  style={{
                                    color:
                                      hovered === index
                                        ? "var(--emerald-deep)"
                                        : "rgba(16,42,32,0.7)",
                                  }}
                                >
                                  {metric.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        {hovered === index ? (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 lg:flex lg:justify-end"
                          >
                            <Link
                              href={project.href}
                              className="text-[11px] font-mono text-emerald-deep hover:text-emerald-deep transition-colors"
                            >
                              {t("caseStudy")} <ForwardMark />
                            </Link>
                          </motion.div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <div className="border-t border-[rgba(16,42,32,0.12)] pt-8 mt-0 flex items-center justify-between">
          <span className="text-sm font-mono text-muted-on-light">
            {items === null ? "" : t("shown", { shown: projects.length, total })}
          </span>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-mono text-emerald-deep hover:text-emerald-deep transition-colors"
          >
            {t("viewAll")} <ForwardMark />
          </Link>
        </div>
      </div>
    </section>
  );
}
