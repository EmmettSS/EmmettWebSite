import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const capabilities = [
  { label: "AI & Machine Learning", x: 50, y: 18, color: "#10B981", main: true },
  { label: "LLMs & Agents", x: 28, y: 32, color: "#10B981", main: false },
  { label: "Computer Vision", x: 72, y: 32, color: "#10B981", main: false },
  { label: "Cybersecurity", x: 15, y: 55, color: "#22D3EE", main: true },
  { label: "Zero Trust", x: 6, y: 72, color: "#22D3EE", main: false },
  { label: "Threat Intelligence", x: 26, y: 70, color: "#22D3EE", main: false },
  { label: "Backend", x: 50, y: 55, color: "#818CF8", main: true },
  { label: "Cloud & Infra", x: 38, y: 72, color: "#818CF8", main: false },
  { label: "Data Engineering", x: 60, y: 72, color: "#818CF8", main: false },
  { label: "Frontend & UI/UX", x: 82, y: 55, color: "#818CF8", main: true },
  { label: "WebGL & 3D", x: 92, y: 70, color: "#818CF8", main: false },
  { label: "Automation", x: 72, y: 70, color: "#10B981", main: false },
];

const edges = [
  [0, 1], [0, 2], [0, 6],
  [3, 4], [3, 5], [3, 6],
  [6, 7], [6, 8], [6, 9],
  [9, 10], [9, 11],
  [0, 3], [0, 9],
];

export function EngineeringTeaser() {
  return (
    <section className="relative py-40 overflow-hidden">

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
                <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
                  The Engineering System
                </span>
              </div>
              <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-medium leading-tight tracking-tight text-[#F5F6F7]">
                Every capability,<br />
                <span className="text-[rgba(245,246,247,0.38)]">one connected system</span>
              </h2>
            </div>

            <p className="text-[rgba(245,246,247,0.55)] leading-relaxed max-w-md">
              Emmett's engineering capabilities form an interconnected system — not a menu of isolated services.
              AI informs security. Security shapes infrastructure. Infrastructure enables frontend.
            </p>

            <div className="space-y-3">
              {[
                { label: "AI & Machine Learning", color: "#10B981" },
                { label: "Cybersecurity Architecture", color: "#22D3EE" },
                { label: "Backend & Cloud Infrastructure", color: "#818CF8" },
                { label: "Frontend Systems & UI/UX", color: "#818CF8" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-[rgba(245,246,247,0.55)] font-mono">{c.label}</span>
                </div>
              ))}
            </div>

            <Link
              to="/services"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.08] text-sm font-mono text-[rgba(245,246,247,0.55)] hover:border-[rgba(16,185,129,0.3)] hover:text-[#10B981] transition-all duration-150"
            >
              Explore the Engineering System
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right — Node graph preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative rounded-2xl border border-white/[0.05] bg-[rgba(10,11,14,0.6)] backdrop-blur-sm overflow-hidden p-2"
            style={{ aspectRatio: "4/3" }}
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 100 90"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Edges */}
              {edges.map(([ai, bi], i) => {
                const a = capabilities[ai];
                const b = capabilities[bi];
                return (
                  <motion.line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="rgba(245,246,247,0.06)"
                    strokeWidth="0.3"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08 }}
                  />
                );
              })}

              {/* Traveling pulses */}
              {edges.slice(0, 5).map(([ai, bi], i) => {
                const a = capabilities[ai];
                const b = capabilities[bi];
                return (
                  <motion.circle
                    key={`p-${i}`}
                    r="0.5"
                    fill={a.color}
                    opacity={0.6}
                    animate={{ cx: [a.x, b.x, a.x], cy: [a.y, b.y, a.y] }}
                    transition={{ duration: 3 + i * 0.7, repeat: Infinity, ease: "linear", delay: i * 0.6 }}
                  />
                );
              })}

              {/* Nodes */}
              {capabilities.map((cap, i) => (
                <g key={i}>
                  <motion.circle
                    cx={cap.x} cy={cap.y}
                    r={cap.main ? 3 : 2}
                    fill={cap.color}
                    opacity={cap.main ? 0.8 : 0.4}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: cap.main ? 0.8 : 0.4 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                    style={{ transformOrigin: `${cap.x}px ${cap.y}px` }}
                  />
                  {cap.main && (
                    <motion.text
                      x={cap.x} y={cap.y - 4.5}
                      textAnchor="middle"
                      fill={cap.color}
                      fontSize="2.8"
                      fontFamily="JetBrains Mono, monospace"
                      opacity={0.7}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 0.7 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                    >
                      {cap.label}
                    </motion.text>
                  )}
                </g>
              ))}
            </svg>

            {/* "View full system" overlay hint */}
            <div className="absolute bottom-4 right-4">
              <span className="text-[10px] font-mono text-[rgba(245,246,247,0.2)] tracking-widest">
                INTERACTIVE ON /SERVICES
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
