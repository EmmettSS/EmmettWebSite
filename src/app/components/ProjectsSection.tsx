import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";

const projects = [
  {
    num: "001",
    title: "Athena Intelligence Platform",
    industry: "Defense & Intelligence",
    description: "Distributed intelligence fusion system processing multi-source data streams for real-time situational awareness at national scale.",
    tech: ["Go", "Kafka", "Kubernetes", "ML Pipeline", "PostgreSQL"],
    outcome: "14ms median latency at 2.4M events/sec",
    year: "2025",
    size: "large",
  },
  {
    num: "002",
    title: "Meridian Supply Chain",
    industry: "Logistics & Operations",
    description: "Real-time supply chain visibility and optimization engine covering procurement, manufacturing and last-mile delivery across 40+ countries.",
    tech: ["Python", "FastAPI", "Apache Spark", "Redis", "React"],
    outcome: "31% reduction in logistics overhead",
    year: "2025",
    size: "medium",
  },
  {
    num: "003",
    title: "Axon Bioinformatics",
    industry: "Healthcare & Research",
    description: "Genomic analysis pipeline for rare disease diagnosis — sequence alignment, variant calling, and AI-assisted phenotype matching for clinical teams.",
    tech: ["Python", "Nextflow", "PyTorch", "PostgreSQL", "Docker"],
    outcome: "Reduced analysis time from 72h to 4h",
    year: "2024",
    size: "medium",
  },
];

export function ProjectsSection() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="py-28 lg:py-36" style={{ background: "#DDEDE5" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="mb-16 grid lg:grid-cols-[1fr_1fr] gap-8 items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="w-6 h-px bg-[#0B6B48]" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#0B6B48]">
                Projects · 03
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#102A20] leading-tight"
            >
              What we've built.
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-[rgba(16,42,32,0.55)] leading-relaxed max-w-[40ch] lg:text-right lg:ml-auto"
          >
            Real problems. Real constraints. Real systems.
          </motion.p>
        </div>

        {/* Project list — editorial, not cards */}
        <div className="space-y-0">
          {projects.map((p, i) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="border-t border-[rgba(16,42,32,0.12)] py-8 group cursor-default"
            >
              <div className="grid lg:grid-cols-[80px_1fr_280px] gap-6 items-start">
                {/* Number */}
                <div className="pt-1">
                  <span className="text-[clamp(1.8rem,4vw,3rem)] font-mono font-bold text-[rgba(16,42,32,0.12)] leading-none select-none">
                    {p.num}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[rgba(16,42,32,0.4)]">
                      {p.industry}
                    </span>
                    <span className="text-[rgba(16,42,32,0.2)] text-sm">·</span>
                    <span className="text-[10px] font-mono text-[rgba(16,42,32,0.3)]">{p.year}</span>
                  </div>
                  <h3
                    className="text-xl lg:text-2xl font-semibold text-[#102A20] mb-3 transition-colors duration-200"
                    style={{ color: hovered === i ? "#0B6B48" : "#102A20" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm text-[rgba(16,42,32,0.55)] leading-relaxed max-w-[52ch] mb-4">
                    {p.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tech.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border border-[rgba(16,42,32,0.15)] text-[rgba(16,42,32,0.45)] bg-[rgba(16,42,32,0.04)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Outcome */}
                <div className="lg:text-right">
                  <div className="inline-block text-left lg:text-right">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[rgba(16,42,32,0.3)] block mb-2">
                      Outcome
                    </span>
                    <p
                      className="text-sm font-mono font-semibold transition-colors duration-200"
                      style={{ color: hovered === i ? "#0B6B48" : "rgba(16,42,32,0.7)" }}
                    >
                      {p.outcome}
                    </p>
                  </div>

                  {hovered === i && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 lg:flex lg:justify-end"
                    >
                      <Link
                        to="/projects"
                        className="text-[11px] font-mono text-[#0B6B48] hover:text-[#1FAE6E] transition-colors"
                      >
                        Read case study →
                      </Link>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-[rgba(16,42,32,0.12)] pt-8 mt-0 flex items-center justify-between">
          <span className="text-sm font-mono text-[rgba(16,42,32,0.4)]">
            3 of 12 projects shown
          </span>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm font-mono text-[#0B6B48] hover:text-[#1FAE6E] transition-colors"
          >
            View all projects →
          </Link>
        </div>
      </div>
    </section>
  );
}
