"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import type { HomeCourse } from "./home-data";
import { ForwardMark } from "./forward-mark";

// Geometry and colors are decorative only. Course names and metadata always
// come from published Academy records.
const pathGeometry = [
  {
    color: "#1FAE6E",
    nodes: [
      { x: 15, y: 30 },
      { x: 30, y: 22 },
      { x: 48, y: 30 },
      { x: 65, y: 22 },
      { x: 82, y: 30 },
    ],
  },
  {
    color: "#35C98A",
    nodes: [
      { x: 12, y: 50 },
      { x: 32, y: 50 },
      { x: 52, y: 50 },
      { x: 70, y: 50 },
      { x: 86, y: 50 },
    ],
  },
  {
    color: "#4D9BE8",
    nodes: [
      { x: 14, y: 70 },
      { x: 32, y: 70 },
      { x: 50, y: 70 },
      { x: 67, y: 70 },
      { x: 84, y: 70 },
    ],
  },
] as const;

const graphLinks = [
  { from: { x: 15, y: 30 }, to: { x: 30, y: 22 } },
  { from: { x: 30, y: 22 }, to: { x: 48, y: 30 } },
  { from: { x: 48, y: 30 }, to: { x: 65, y: 22 } },
  { from: { x: 65, y: 22 }, to: { x: 82, y: 30 } },
  { from: { x: 12, y: 50 }, to: { x: 32, y: 50 } },
  { from: { x: 32, y: 50 }, to: { x: 52, y: 50 } },
  { from: { x: 52, y: 50 }, to: { x: 70, y: 50 } },
  { from: { x: 70, y: 50 }, to: { x: 86, y: 50 } },
  { from: { x: 14, y: 70 }, to: { x: 32, y: 70 } },
  { from: { x: 32, y: 70 }, to: { x: 50, y: 70 } },
  { from: { x: 50, y: 70 }, to: { x: 67, y: 70 } },
  { from: { x: 67, y: 70 }, to: { x: 84, y: 70 } },
  { from: { x: 48, y: 30 }, to: { x: 52, y: 50 } },
  { from: { x: 65, y: 22 }, to: { x: 70, y: 50 } },
  { from: { x: 52, y: 50 }, to: { x: 50, y: 70 } },
];

export function AcademySection({ courses }: { courses: HomeCourse[] | null }) {
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations("ui.academy");
  const common = useTranslations("common");
  const empty = useTranslations("academy");
  const paths = (courses ?? []).slice(0, pathGeometry.length).map((course, index) => ({
    ...course,
    ...pathGeometry[index]!,
  }));
  const activePath = paths.find((path) => path.id === activePathId) ?? null;

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pathMessage = courses === null ? common("contentUnavailable") : empty("empty");

  return (
    <section ref={sectionRef} className="py-28 lg:py-36" style={{ background: "var(--card)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="mb-16 grid lg:grid-cols-[1fr_1fr] gap-8 items-end">
          <div>
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
              className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-foreground leading-tight"
            >
              {t("title")}
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-muted-on-dark leading-relaxed max-w-[40ch] lg:ms-auto"
          >
            {t("lead")}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-14 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-input overflow-hidden p-6"
            style={{ background: "rgba(7,19,15,0.5)", aspectRatio: "16/9" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-muted-on-dark tracking-widest uppercase">
                {t("graph")}
              </span>
              {activePath ? (
                <motion.span
                  key={activePath.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] font-mono tracking-wider"
                  style={{ color: activePath.color }}
                >
                  {activePath.title}
                </motion.span>
              ) : null}
            </div>

            <svg viewBox="0 0 100 90" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {paths.length > 0
                ? graphLinks.map((link, index) => {
                    const crossLink = index >= 12;
                    return (
                      <line
                        key={index}
                        x1={link.from.x}
                        y1={link.from.y}
                        x2={link.to.x}
                        y2={link.to.y}
                        stroke={crossLink ? "rgba(77,155,232,0.15)" : "rgba(31,174,110,0.2)"}
                        strokeWidth={crossLink ? 0.3 : 0.4}
                        strokeDasharray={crossLink ? "1 2" : undefined}
                      />
                    );
                  })
                : null}

              {paths.map((path, pathIndex) => (
                <g key={path.id}>
                  {path.nodes.map((node, nodeIndex) => {
                    const selected = activePathId === path.id;
                    return (
                      <g
                        key={`${path.id}-${nodeIndex}`}
                        onMouseEnter={() => setActivePathId(path.id)}
                        onMouseLeave={() => setActivePathId(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={selected ? 3 : 2.2}
                          fill={selected ? path.color : "rgba(243,250,246,0.08)"}
                          stroke={selected ? path.color : "rgba(243,250,246,0.1)"}
                          strokeWidth={selected ? 0.7 : 0.4}
                          style={{ transition: "all 0.25s" }}
                        />
                      </g>
                    );
                  })}
                  <text
                    x={3}
                    y={path.nodes[0]!.y + 1}
                    fontSize="2.6"
                    fill={activePathId === path.id ? path.color : "rgba(243,250,246,0.2)"}
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="0.02em"
                  >
                    {String(pathIndex + 1).padStart(2, "0")}
                  </text>
                </g>
              ))}

              {inView && activePath
                ? activePath.nodes
                    .slice(0, 3)
                    .map((node, index) => (
                      <circle
                        key={index}
                        cx={node.x}
                        cy={node.y}
                        r={4}
                        fill="none"
                        stroke={activePath.color}
                        strokeWidth="0.5"
                        opacity={0.2}
                      />
                    ))
                : null}
            </svg>
          </motion.div>

          <div className="space-y-4">
            <p className="text-[10px] font-mono text-muted-on-dark tracking-widest uppercase mb-6">
              {t("available")}
            </p>
            {courses === null || courses.length === 0 ? (
              <p role="status" className="py-4 text-sm text-muted-on-dark">
                {pathMessage}
              </p>
            ) : (
              paths.map((path, index) => (
                <motion.article
                  key={path.id}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07 }}
                  onMouseEnter={() => setActivePathId(path.id)}
                  onMouseLeave={() => setActivePathId(null)}
                  className="p-4 rounded-xl border transition-all duration-200"
                  style={{
                    borderColor:
                      activePathId === path.id ? `${path.color}35` : "rgba(31,174,110,0.1)",
                    background: activePathId === path.id ? `${path.color}08` : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: path.color }}
                        />
                        <h3
                          className="text-sm font-semibold transition-colors duration-150"
                          style={{
                            color: activePathId === path.id ? path.color : "var(--foreground)",
                          }}
                        >
                          <Link href={path.href}>{path.title}</Link>
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-muted-on-dark ms-3.5">
                        {[path.levelLabel, path.meta].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-muted-on-dark flex-shrink-0">
                      {t("lessonCount", { count: path.lessonCount })}
                    </span>
                  </div>
                  <div className="mt-3 h-px bg-[rgba(243,250,246,0.08)]" aria-hidden="true" />
                </motion.article>
              ))
            )}

            <div className="pt-2">
              <Link
                href="/academy"
                className="inline-flex items-center gap-2 text-sm font-mono text-primary hover:text-accent transition-colors"
              >
                {t("start")} <ForwardMark />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
