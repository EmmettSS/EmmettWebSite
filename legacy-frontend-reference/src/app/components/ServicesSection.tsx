import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";

const services = [
  {
    id: "software",
    num: "01",
    title: "Software Engineering",
    copy: "Robust software systems designed for scale, reliability and long-term evolution.",
    tags: ["Architecture", "Backend", "APIs", "Distributed Systems"],
  },
  {
    id: "ai",
    num: "02",
    title: "AI / Machine Learning",
    copy: "From data to intelligent systems — we turn machine learning research into usable products.",
    tags: ["ML", "Deep Learning", "LLMs", "Computer Vision"],
  },
  {
    id: "security",
    num: "03",
    title: "Cybersecurity",
    copy: "Security engineered into the system — from attack surface to infrastructure hardening.",
    tags: ["Appsec", "Pentesting", "Threat Analysis", "Security Automation"],
  },
  {
    id: "product",
    num: "04",
    title: "Product Engineering",
    copy: "We transform complex ideas into products people can actually use and build on.",
    tags: ["UX", "UI", "Prototyping", "Product Architecture"],
  },
  {
    id: "infra",
    num: "05",
    title: "Infrastructure",
    copy: "The systems beneath the systems. Cloud, DevOps, containers, deployment, observability.",
    tags: ["Cloud", "DevOps", "Containers", "Observability"],
  },
];

type ClusterNode = { x: number; y: number };
type Cluster = {
  id: string;
  center: { x: number; y: number };
  nodes: ClusterNode[];
};

const clusters: Cluster[] = [
  {
    id: "software",
    center: { x: 28, y: 42 },
    nodes: [
      { x: 20, y: 36 }, { x: 30, y: 32 }, { x: 36, y: 42 },
      { x: 22, y: 50 }, { x: 32, y: 52 },
    ],
  },
  {
    id: "ai",
    center: { x: 52, y: 20 },
    nodes: [
      { x: 44, y: 16 }, { x: 54, y: 12 }, { x: 62, y: 20 },
      { x: 50, y: 28 }, { x: 58, y: 28 },
    ],
  },
  {
    id: "security",
    center: { x: 76, y: 40 },
    nodes: [
      { x: 68, y: 34 }, { x: 80, y: 32 }, { x: 84, y: 44 },
      { x: 72, y: 50 }, { x: 80, y: 52 },
    ],
  },
  {
    id: "product",
    center: { x: 64, y: 64 },
    nodes: [
      { x: 56, y: 58 }, { x: 68, y: 56 }, { x: 74, y: 66 },
      { x: 60, y: 72 }, { x: 70, y: 72 },
    ],
  },
  {
    id: "infra",
    center: { x: 26, y: 66 },
    nodes: [
      { x: 18, y: 60 }, { x: 28, y: 58 }, { x: 36, y: 66 },
      { x: 20, y: 74 }, { x: 32, y: 74 },
    ],
  },
];

const clusterLinks: [string, string][] = [
  ["software", "ai"],
  ["software", "infra"],
  ["software", "product"],
  ["ai", "security"],
  ["ai", "product"],
  ["security", "product"],
  ["product", "infra"],
];

function getCluster(id: string) {
  return clusters.find((c) => c.id === id)!;
}

function isActiveCluster(id: string, active: string | null) {
  if (!active) return false;
  if (id === active) return true;
  return clusterLinks.some(([a, b]) => (a === active && b === id) || (b === active && a === id));
}

export function ServicesSection() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="py-28 lg:py-36" style={{ background: "#F1F7F3" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="w-6 h-px bg-[#1FAE6E]" />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
              Services · 01
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#102A20] leading-tight max-w-2xl"
          >
            Engineering across the entire stack.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="mt-4 text-base text-[rgba(16,42,32,0.58)] max-w-[52ch] leading-relaxed"
          >
            From infrastructure to intelligence, we design and build the systems that make ambitious products possible.
          </motion.p>
        </div>

        {/* Two-column: service list + system map */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-16 items-start">

          {/* Services list */}
          <div className="space-y-0">
            {services.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                className={`group border-b border-[rgba(16,42,32,0.1)] py-6 cursor-default transition-all duration-200 ${
                  active === s.id ? "pl-4" : "pl-0"
                }`}
                style={{
                  borderLeft: active === s.id ? "2px solid #1FAE6E" : "2px solid transparent",
                }}
              >
                <div className="flex items-start gap-5">
                  <span className="text-[11px] font-mono text-[rgba(16,42,32,0.3)] mt-1 pt-0.5 w-6 flex-shrink-0 tracking-widest">
                    {s.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-base font-semibold transition-colors duration-150"
                        style={{ color: active === s.id ? "#1FAE6E" : "#102A20" }}
                      >
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[rgba(16,42,32,0.55)] leading-relaxed mb-3">
                      {s.copy}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border"
                          style={{
                            color: active === s.id ? "#1FAE6E" : "rgba(16,42,32,0.4)",
                            borderColor: active === s.id ? "rgba(31,174,110,0.3)" : "rgba(16,42,32,0.1)",
                            background: active === s.id ? "rgba(31,174,110,0.05)" : "transparent",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="pt-8">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-sm font-mono text-[#1FAE6E] hover:text-[#35C98A] transition-colors"
              >
                View full engineering system →
              </Link>
            </div>
          </div>

          {/* System Map SVG */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sticky top-24 rounded-2xl overflow-hidden border border-[rgba(16,42,32,0.08)] bg-[rgba(16,42,32,0.03)] p-6"
            style={{ aspectRatio: "4/3" }}
          >
            <div className="absolute top-4 left-4 text-[10px] font-mono text-[rgba(16,42,32,0.3)] tracking-widest uppercase">
              System Map · Hover to explore
            </div>

            <svg
              viewBox="0 0 100 86"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Cross-cluster connections */}
              {clusterLinks.map(([aId, bId], i) => {
                const a = getCluster(aId);
                const b = getCluster(bId);
                const isHighlighted =
                  active === aId ||
                  active === bId ||
                  (isActiveCluster(aId, active) && isActiveCluster(bId, active));
                return (
                  <line
                    key={i}
                    x1={a.center.x}
                    y1={a.center.y}
                    x2={b.center.x}
                    y2={b.center.y}
                    stroke={isHighlighted ? "rgba(31,174,110,0.5)" : "rgba(16,42,32,0.08)"}
                    strokeWidth={isHighlighted ? 0.6 : 0.3}
                    strokeDasharray={isHighlighted ? undefined : "1 2"}
                    style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                  />
                );
              })}

              {/* Intra-cluster connections */}
              {clusters.map((cluster) => {
                const isClusterActive = isActiveCluster(cluster.id, active);
                return cluster.nodes.map((nodeA, ia) =>
                  cluster.nodes.slice(ia + 1, ia + 3).map((nodeB, ib) => (
                    <line
                      key={`${cluster.id}-${ia}-${ib}`}
                      x1={nodeA.x}
                      y1={nodeA.y}
                      x2={nodeB.x}
                      y2={nodeB.y}
                      stroke={isClusterActive ? "rgba(31,174,110,0.35)" : "rgba(16,42,32,0.07)"}
                      strokeWidth={isClusterActive ? 0.5 : 0.25}
                      style={{ transition: "stroke 0.2s" }}
                    />
                  ))
                );
              })}

              {/* Cluster nodes */}
              {clusters.map((cluster) => {
                const isClusterActive = cluster.id === active;
                const isConnected = isActiveCluster(cluster.id, active) && cluster.id !== active;
                return (
                  <g key={cluster.id}>
                    {cluster.nodes.map((node, i) => (
                      <circle
                        key={i}
                        cx={node.x}
                        cy={node.y}
                        r={isClusterActive ? 2.2 : 1.5}
                        fill={
                          isClusterActive
                            ? "#1FAE6E"
                            : isConnected
                            ? "rgba(31,174,110,0.4)"
                            : "rgba(16,42,32,0.2)"
                        }
                        style={{ transition: "all 0.2s" }}
                      />
                    ))}
                    {/* Cluster center — larger hub node */}
                    <circle
                      cx={cluster.center.x}
                      cy={cluster.center.y}
                      r={isClusterActive ? 3.5 : 2.5}
                      fill={
                        isClusterActive
                          ? "#1FAE6E"
                          : isConnected
                          ? "rgba(31,174,110,0.3)"
                          : "rgba(16,42,32,0.15)"
                      }
                      stroke={isClusterActive ? "#1FAE6E" : "rgba(16,42,32,0.2)"}
                      strokeWidth={isClusterActive ? 0.6 : 0.3}
                      style={{ transition: "all 0.2s" }}
                    />
                    {/* Service label */}
                    <text
                      x={cluster.center.x}
                      y={cluster.center.y + 7}
                      textAnchor="middle"
                      fontSize="3.2"
                      fill={isClusterActive ? "#1FAE6E" : "rgba(16,42,32,0.4)"}
                      fontFamily="JetBrains Mono, monospace"
                      letterSpacing="0.03em"
                      style={{ transition: "fill 0.2s" }}
                    >
                      {services.find((sv) => sv.id === cluster.id)?.num}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Active service label overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              {active ? (
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-mono text-[#1FAE6E] tracking-wide"
                >
                  {services.find((s) => s.id === active)?.title}
                </motion.div>
              ) : (
                <div className="text-[11px] font-mono text-[rgba(16,42,32,0.3)] tracking-wide">
                  Hover a service to activate
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
