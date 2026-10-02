import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";

const articles = [
  {
    category: "AI / ML",
    title: "Building production LLM pipelines without the hype",
    author: "Ali Karimi",
    date: "Aug 2026",
    readTime: "14 min",
    featured: true,
    excerpt: "A practical breakdown of how we designed and deployed a real-time document intelligence system — what worked, what failed, and what we learned building at scale.",
  },
  {
    category: "Cybersecurity",
    title: "Attack surface mapping at scale with graph theory",
    author: "Sara Tehrani",
    date: "Jul 2026",
    readTime: "11 min",
    featured: false,
  },
  {
    category: "Systems",
    title: "Distributed consensus: beyond Raft and Paxos",
    author: "Reza Mohammadi",
    date: "Jul 2026",
    readTime: "18 min",
    featured: false,
  },
  {
    category: "Engineering",
    title: "The cost of premature abstraction in Go microservices",
    author: "Ali Karimi",
    date: "Jun 2026",
    readTime: "9 min",
    featured: false,
  },
  {
    category: "Bioinformatics",
    title: "Sequence alignment algorithms for clinical genomics",
    author: "Neda Hosseini",
    date: "Jun 2026",
    readTime: "22 min",
    featured: false,
  },
];

const categoryColors: Record<string, string> = {
  "AI / ML": "#1FAE6E",
  "Cybersecurity": "#4C9BE8",
  "Systems": "#0B6B48",
  "Engineering": "#35C98A",
  "Bioinformatics": "#7DD8B4",
};

export function LibrarySection() {
  const [hovered, setHovered] = useState<number | null>(null);
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <section className="py-28 lg:py-36" style={{ background: "#F4F6F1" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="mb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="w-6 h-px bg-[#1FAE6E]" />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
              Library · 04
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#102A20] leading-tight max-w-3xl"
          >
            What we&apos;re learning, building and thinking about.
          </motion.h2>
        </div>

        {/* Featured article */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 p-8 rounded-2xl border border-[rgba(16,42,32,0.1)] bg-[rgba(16,42,32,0.03)] group cursor-default hover:bg-[rgba(16,42,32,0.05)] transition-all duration-200"
        >
          <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded"
                  style={{
                    color: categoryColors[featured.category] || "#1FAE6E",
                    background: `${categoryColors[featured.category] || "#1FAE6E"}15`,
                  }}
                >
                  {featured.category}
                </span>
                <span className="text-[10px] font-mono text-[rgba(16,42,32,0.3)] tracking-widest">Featured</span>
              </div>
              {/* Editorial serif title for featured */}
              <h3 className="font-editorial text-[clamp(1.5rem,3vw,2.2rem)] font-medium text-[#102A20] leading-tight mb-4">
                {featured.title}
              </h3>
              <p className="text-sm text-[rgba(16,42,32,0.55)] leading-relaxed mb-5">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[rgba(16,42,32,0.15)] flex items-center justify-center">
                    <span className="text-[8px] font-mono text-[rgba(16,42,32,0.5)]">AK</span>
                  </div>
                  <span className="text-xs font-mono text-[rgba(16,42,32,0.5)]">{featured.author}</span>
                </div>
                <span className="text-[rgba(16,42,32,0.2)]">·</span>
                <span className="text-xs font-mono text-[rgba(16,42,32,0.38)]">{featured.date}</span>
                <span className="text-[rgba(16,42,32,0.2)]">·</span>
                <span className="text-xs font-mono text-[rgba(16,42,32,0.38)]">{featured.readTime} read</span>
              </div>
            </div>
            {/* Right visual */}
            <div className="hidden lg:block h-44 rounded-xl bg-[rgba(16,42,32,0.06)] border border-[rgba(16,42,32,0.08)] relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 120" className="w-full h-full opacity-25">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line
                      key={i}
                      x1={20 + i * 24}
                      y1={10}
                      x2={20 + i * 24}
                      y2={110}
                      stroke="#102A20"
                      strokeWidth="0.3"
                    />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line
                      key={i}
                      x1={10}
                      y1={15 + i * 18}
                      x2={190}
                      y2={15 + i * 18}
                      stroke="#102A20"
                      strokeWidth="0.3"
                    />
                  ))}
                  <polyline
                    points="20,90 44,70 68,75 92,45 116,55 140,30 164,40 188,20"
                    fill="none"
                    stroke="#1FAE6E"
                    strokeWidth="1.5"
                  />
                  {[20, 44, 68, 92, 116, 140, 164, 188].map((x, i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={[90, 70, 75, 45, 55, 30, 40, 20][i]}
                      r="2.5"
                      fill="#1FAE6E"
                    />
                  ))}
                </svg>
              </div>
              <div className="absolute bottom-3 right-3 text-[9px] font-mono text-[rgba(16,42,32,0.3)] tracking-widest uppercase">
                LLM Throughput Analysis
              </div>
            </div>
          </div>
        </motion.div>

        {/* Article rows */}
        <div className="space-y-0">
          {rest.map((article, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="border-t border-[rgba(16,42,32,0.1)] py-5 group cursor-default transition-all duration-150"
              style={{
                paddingLeft: hovered === i ? "12px" : "0",
                borderLeft: hovered === i ? "2px solid rgba(31,174,110,0.4)" : "2px solid transparent",
              }}
            >
              <div className="grid lg:grid-cols-[100px_1fr_200px_80px_80px] gap-4 items-center">
                <span
                  className="text-[9px] font-mono tracking-widest uppercase"
                  style={{ color: categoryColors[article.category] || "#1FAE6E" }}
                >
                  {article.category}
                </span>
                <h4 className="text-sm font-medium text-[#102A20] group-hover:text-[#0B6B48] transition-colors duration-150 pr-4">
                  {article.title}
                </h4>
                <span className="text-xs font-mono text-[rgba(16,42,32,0.4)] hidden lg:block">
                  {article.author}
                </span>
                <span className="text-xs font-mono text-[rgba(16,42,32,0.3)] hidden lg:block">
                  {article.date}
                </span>
                <div className="flex items-center justify-between lg:justify-end gap-4">
                  <span className="text-xs font-mono text-[rgba(16,42,32,0.3)]">{article.readTime}</span>
                  <span
                    className="text-sm text-[rgba(16,42,32,0.3)] group-hover:text-[#1FAE6E] transition-colors duration-150"
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-[rgba(16,42,32,0.1)] pt-8 mt-0 flex items-center justify-between">
          <span className="text-xs font-mono text-[rgba(16,42,32,0.35)]">
            Engineering, AI, Security, Bioinformatics, Systems, Research
          </span>
          <Link
            to="/library"
            className="text-sm font-mono text-[#1FAE6E] hover:text-[#35C98A] transition-colors"
          >
            Open Library →
          </Link>
        </div>
      </div>
    </section>
  );
}
