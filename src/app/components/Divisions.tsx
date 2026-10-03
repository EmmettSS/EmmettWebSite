import { motion } from "motion/react";
import { Brain, Shield, Server, Layout, Sparkles, Cloud, FlaskConical } from "lucide-react";
import { useEffect, useRef } from "react";

// Mini waveform for AI division
function Waveform({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-0.5 h-6">
      {[3, 7, 5, 9, 4, 8, 6, 3, 7, 5, 4, 8].map((h, i) => (
        <motion.div
          key={i}
          className="w-0.5 rounded-full"
          style={{ backgroundColor: color, opacity: 0.6 }}
          animate={{ height: [h * 2, h * 3, h * 2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Scan sweep for cybersecurity
function ScanSweep({ color }: { color: string }) {
  return (
    <div className="relative w-full h-6 overflow-hidden rounded">
      <div className="absolute inset-0 opacity-10 rounded" style={{ backgroundColor: color }} />
      <motion.div
        className="absolute top-0 bottom-0 w-0.5 rounded"
        style={{ backgroundColor: color }}
        animate={{ left: ["0%", "100%", "0%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute top-1/2 -translate-y-1/2 w-full h-px opacity-10"
          style={{ backgroundColor: color, top: `${20 + i * 15}%` }}
        />
      ))}
    </div>
  );
}

// Node pulse for backend
function NodePulse({ color }: { color: string }) {
  const nodes = [
    { x: 10, y: 50 }, { x: 35, y: 20 }, { x: 35, y: 80 }, { x: 65, y: 35 }, { x: 65, y: 65 }, { x: 90, y: 50 }
  ];
  return (
    <div className="relative w-full h-6">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {nodes.slice(0, -1).map((n, i) => (
          <line key={i} x1={n.x} y1={n.y} x2={nodes[i + 1].x} y2={nodes[i + 1].y}
            stroke={color} strokeWidth="1.5" opacity="0.2" />
        ))}
        {nodes.map((n, i) => (
          <motion.circle key={i} cx={n.x} cy={n.y} r="4"
            fill={color} opacity="0.5"
            animate={{ opacity: [0.3, 0.8, 0.3], r: [3, 5, 3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </svg>
    </div>
  );
}

const divisions = [
  {
    icon: Brain,
    index: "01",
    title: "AI Systems",
    subtitle: "LLM Engineering · Computer Vision · Intelligent Agents",
    description: "Engineering AI-native platforms, language models, and autonomous intelligent systems.",
    color: "#10B981",
    borderColor: "rgba(16,185,129,0.2)",
    hoverBorder: "rgba(16,185,129,0.5)",
    viz: <Waveform color="#10B981" />,
    span: "lg:col-span-2",
  },
  {
    icon: Shield,
    index: "02",
    title: "Cybersecurity",
    subtitle: "Threat Intelligence · Zero Trust · Network Defense",
    description: "Designing secure architectures and real-time threat monitoring infrastructure.",
    color: "#22D3EE",
    borderColor: "rgba(34,211,238,0.2)",
    hoverBorder: "rgba(34,211,238,0.5)",
    viz: <ScanSweep color="#22D3EE" />,
    span: "",
  },
  {
    icon: Server,
    index: "03",
    title: "Backend Infrastructure",
    subtitle: "Distributed Systems · Cloud · DevOps",
    description: "Scalable, fault-tolerant distributed systems built for millions of requests.",
    color: "#818CF8",
    borderColor: "rgba(129,140,248,0.2)",
    hoverBorder: "rgba(129,140,248,0.5)",
    viz: <NodePulse color="#818CF8" />,
    span: "",
  },
  {
    icon: Layout,
    index: "04",
    title: "Frontend Systems",
    subtitle: "React · WebGL · Motion Engineering",
    description: "High-performance interactive interfaces and immersive 3D web experiences.",
    color: "#818CF8",
    borderColor: "rgba(129,140,248,0.2)",
    hoverBorder: "rgba(129,140,248,0.5)",
    viz: <Waveform color="#818CF8" />,
    span: "",
  },
  {
    icon: Sparkles,
    index: "05",
    title: "Creative Technology",
    subtitle: "3D Visualization · Motion · Branding",
    description: "Where engineering meets art — crafting digital experiences that define brands.",
    color: "#818CF8",
    borderColor: "rgba(129,140,248,0.2)",
    hoverBorder: "rgba(129,140,248,0.5)",
    viz: <Waveform color="#818CF8" />,
    span: "",
  },
  {
    icon: Cloud,
    index: "06",
    title: "Cloud Engineering",
    subtitle: "AWS · Kubernetes · Terraform",
    description: "Multi-cloud infrastructure automation and site reliability at enterprise scale.",
    color: "#22D3EE",
    borderColor: "rgba(34,211,238,0.2)",
    hoverBorder: "rgba(34,211,238,0.5)",
    viz: <NodePulse color="#22D3EE" />,
    span: "",
  },
  {
    icon: FlaskConical,
    index: "07",
    title: "Research Division",
    subtitle: "LLMs · Multi-Agent · Edge AI",
    description: "Experimental R&D translating academic research into production-grade systems.",
    color: "#10B981",
    borderColor: "rgba(16,185,129,0.2)",
    hoverBorder: "rgba(16,185,129,0.5)",
    viz: <ScanSweep color="#10B981" />,
    span: "lg:col-span-2",
  },
];

export function Divisions() {
  return (
    <section id="divisions" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(139,92,246,0.04),transparent_50%)]" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              04 — Core Divisions
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Seven specialized teams,{" "}
            <span className="text-[rgba(245,246,247,0.38)]">one collective</span>
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-4 gap-4">
          {divisions.map((div, i) => {
            const Icon = div.icon;
            return (
              <motion.div
                key={div.index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`group relative p-6 rounded-xl border bg-[rgba(13,15,18,0.6)] backdrop-blur-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_24px_64px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 ${div.span} cursor-pointer`}
                style={{
                  borderColor: div.borderColor,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = div.hoverBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = div.borderColor;
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${div.color}10`, border: `1px solid ${div.color}25` }}>
                    <Icon className="w-5 h-5" style={{ color: div.color }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: div.color, opacity: 0.4 }}>{div.index}</span>
                </div>

                <h3 className="text-base font-semibold text-[#F5F6F7] mb-1">{div.title}</h3>
                <p className="text-xs font-mono text-[rgba(245,246,247,0.38)] mb-3">{div.subtitle}</p>
                <p className="text-sm text-[rgba(245,246,247,0.38)] leading-relaxed mb-5 group-hover:text-[rgba(245,246,247,0.55)] transition-colors">
                  {div.description}
                </p>

                {/* Mini visualization */}
                <div className="mt-auto">{div.viz}</div>

                {/* Hover CTA */}
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-mono" style={{ color: div.color }}>
                    View Division →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
