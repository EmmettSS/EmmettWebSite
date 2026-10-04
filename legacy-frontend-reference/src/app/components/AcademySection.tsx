import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";

const paths = [
  {
    id: "software",
    name: "Software Engineering",
    level: "Foundations → Advanced",
    topics: 48,
    color: "#1FAE6E",
    nodes: [
      { label: "Algorithms", x: 15, y: 30 },
      { label: "Data Structures", x: 30, y: 22 },
      { label: "System Design", x: 48, y: 30 },
      { label: "Distributed", x: 65, y: 22 },
      { label: "Architecture", x: 82, y: 30 },
    ],
  },
  {
    id: "ai",
    name: "AI / Machine Learning",
    level: "Math → Production",
    topics: 56,
    color: "#35C98A",
    nodes: [
      { label: "Linear Algebra", x: 12, y: 50 },
      { label: "ML Fundamentals", x: 32, y: 50 },
      { label: "Deep Learning", x: 52, y: 50 },
      { label: "LLMs", x: 70, y: 50 },
      { label: "MLOps", x: 86, y: 50 },
    ],
  },
  {
    id: "security",
    name: "Cybersecurity",
    level: "Concepts → Expert",
    topics: 42,
    color: "#4C9BE8",
    nodes: [
      { label: "Networking", x: 14, y: 70 },
      { label: "Security Basics", x: 32, y: 70 },
      { label: "Appsec", x: 50, y: 70 },
      { label: "Pentesting", x: 67, y: 70 },
      { label: "Security Eng.", x: 84, y: 70 },
    ],
  },
];

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
  // Cross-path links (shared concepts)
  { from: { x: 48, y: 30 }, to: { x: 52, y: 50 } },
  { from: { x: 65, y: 22 }, to: { x: 70, y: 50 } },
  { from: { x: 52, y: 50 }, to: { x: 50, y: 70 } },
];

export function AcademySection() {
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const activePath = activePathId ? paths.find((p) => p.id === activePathId) : null;

  return (
    <section
      ref={sectionRef}
      className="py-28 lg:py-36"
      style={{ background: "#102A20" }}
    >
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
              <div className="w-6 h-px bg-[#1FAE6E]" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
                Academy · 05
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#F3FAF6] leading-tight"
            >
              Build your way into deeper knowledge.
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-[rgba(243,250,246,0.45)] leading-relaxed max-w-[40ch] lg:ml-auto"
          >
            Courses, paths and practical systems designed around real engineering problems — not artificial curricula.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-14 items-start">

          {/* Knowledge Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-[rgba(31,174,110,0.12)] overflow-hidden p-6"
            style={{ background: "rgba(7,19,15,0.5)", aspectRatio: "16/9" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-[rgba(243,250,246,0.3)] tracking-widest uppercase">
                Knowledge Graph · Learning Paths
              </span>
              {activePath && (
                <motion.span
                  key={activePath.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] font-mono tracking-wider"
                  style={{ color: activePath.color }}
                >
                  {activePath.name}
                </motion.span>
              )}
            </div>

            <svg
              viewBox="0 0 100 90"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Connection lines */}
              {graphLinks.map((link, i) => {
                const isCrossPath = i >= 12;
                return (
                  <line
                    key={i}
                    x1={link.from.x}
                    y1={link.from.y}
                    x2={link.to.x}
                    y2={link.to.y}
                    stroke={
                      isCrossPath
                        ? "rgba(77,155,232,0.15)"
                        : "rgba(31,174,110,0.2)"
                    }
                    strokeWidth={isCrossPath ? 0.3 : 0.4}
                    strokeDasharray={isCrossPath ? "1 2" : undefined}
                  />
                );
              })}

              {/* Path nodes */}
              {paths.map((path) => {
                const isActive = activePathId === path.id;
                return path.nodes.map((node, ni) => {
                  const isCompleted = ni < 2 || (isActive && ni < 3);
                  const isCurrent = isActive && ni === (isActive ? 2 : -1);
                  return (
                    <g
                      key={`${path.id}-${ni}`}
                      onMouseEnter={() => setActivePathId(path.id)}
                      onMouseLeave={() => setActivePathId(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isCurrent ? 3.5 : isCompleted ? 2.8 : 2.2}
                        fill={
                          isCurrent
                            ? path.color
                            : isCompleted
                            ? `${path.color}55`
                            : "rgba(243,250,246,0.08)"
                        }
                        stroke={isCompleted || isActive ? path.color : "rgba(243,250,246,0.1)"}
                        strokeWidth={isCurrent ? 0.8 : 0.4}
                        style={{ transition: "all 0.25s" }}
                      />
                      {isActive && (
                        <text
                          x={node.x}
                          y={node.y - 5}
                          textAnchor="middle"
                          fontSize="2.4"
                          fill={path.color}
                          fontFamily="JetBrains Mono, monospace"
                          style={{ transition: "opacity 0.25s" }}
                          opacity={0.7}
                        >
                          {node.label}
                        </text>
                      )}
                    </g>
                  );
                });
              })}

              {/* Path labels */}
              {paths.map((path) => (
                <text
                  key={path.id}
                  x={3}
                  y={path.nodes[0].y + 1}
                  fontSize="2.6"
                  fill={activePathId === path.id ? path.color : "rgba(243,250,246,0.2)"}
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.02em"
                  style={{ transition: "fill 0.2s" }}
                >
                  {path.id.toUpperCase().slice(0, 3)}
                </text>
              ))}

              {/* Glow pulse on active path nodes */}
              {inView && activePath && activePath.nodes.slice(0, 3).map((node, i) => (
                <circle
                  key={i}
                  cx={node.x}
                  cy={node.y}
                  r={4}
                  fill="none"
                  stroke={activePath.color}
                  strokeWidth="0.5"
                  opacity={0.2}
                />
              ))}
            </svg>
          </motion.div>

          {/* Learning paths list */}
          <div className="space-y-4">
            <p className="text-[10px] font-mono text-[rgba(243,250,246,0.3)] tracking-widest uppercase mb-6">
              Available Paths
            </p>
            {paths.map((path, i) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                onMouseEnter={() => setActivePathId(path.id)}
                onMouseLeave={() => setActivePathId(null)}
                className="p-4 rounded-xl border cursor-default transition-all duration-200"
                style={{
                  borderColor: activePathId === path.id ? `${path.color}35` : "rgba(31,174,110,0.1)",
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
                      <h4
                        className="text-sm font-semibold transition-colors duration-150"
                        style={{ color: activePathId === path.id ? path.color : "#F3FAF6" }}
                      >
                        {path.name}
                      </h4>
                    </div>
                    <p className="text-xs font-mono text-[rgba(243,250,246,0.35)] ml-3.5">
                      {path.level}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[rgba(243,250,246,0.28)] flex-shrink-0">
                    {path.topics} topics
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-0.5 rounded-full bg-[rgba(243,250,246,0.06)] overflow-hidden">
                  <motion.div
                    className="h-0.5 rounded-full"
                    style={{ background: path.color }}
                    initial={{ width: 0 }}
                    animate={{ width: inView ? "40%" : 0 }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}

            <div className="pt-2">
              <Link
                to="/academy"
                className="inline-flex items-center gap-2 text-sm font-mono text-[#1FAE6E] hover:text-[#35C98A] transition-colors"
              >
                Start building →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
