import { motion } from "motion/react";
import { useState } from "react";
import { ChevronDown, Brain, Shield, Server, Cpu, Database } from "lucide-react";

const filters = ["All", "AI", "Security", "Infra", "Data", "Automation"];

const solutions = [
  {
    icon: Brain,
    title: "AI-Powered Platforms",
    problem: "Businesses accumulate massive data lakes with no intelligence layer to act on them.",
    solution: "End-to-end AI platform integrating real-time inference, model management, and adaptive learning pipelines.",
    stack: ["Python", "PyTorch", "FastAPI", "Kubernetes", "Redis"],
    impact: ["10× faster inference", "94% accuracy", "3s p99 latency"],
    category: "AI",
    color: "#10B981",
  },
  {
    icon: Shield,
    title: "Cybersecurity Architecture",
    problem: "Legacy perimeter security fails against modern lateral-movement attacks.",
    solution: "Zero-trust network architecture with behavioral anomaly detection and automated incident response.",
    stack: ["Rust", "Go", "Kafka", "PostgreSQL", "Cloudflare"],
    impact: ["<50ms detection", "99.7% accuracy", "SOC2 compliant"],
    category: "Security",
    color: "#22D3EE",
  },
  {
    icon: Server,
    title: "Cloud Infrastructure",
    problem: "Teams spend 40% of engineering time on infrastructure toil instead of product work.",
    solution: "Infrastructure-as-code platform with self-healing clusters and zero-downtime deployments.",
    stack: ["Terraform", "Kubernetes", "AWS", "Docker", "GitHub Actions"],
    impact: ["99.97% uptime", "60% cost savings", "5min deploys"],
    category: "Infra",
  },
  {
    icon: Cpu,
    title: "LLM Development",
    problem: "Generic LLMs hallucinate on domain-specific knowledge and lack enterprise controls.",
    solution: "Custom fine-tuned models with retrieval-augmented generation, guardrails, and audit logging.",
    stack: ["Python", "Transformers", "FAISS", "FastAPI", "Docker"],
    impact: ["87% retrieval precision", "GDPR ready", "On-prem capable"],
    category: "AI",
    color: "#10B981",
  },
  {
    icon: Database,
    title: "Predictive Analytics",
    problem: "Decision-makers rely on stale dashboards that describe the past, not predict the future.",
    solution: "Real-time ML pipeline with streaming feature stores, live predictions, and explainable outputs.",
    stack: ["Python", "Kafka", "Spark", "PostgreSQL", "Grafana"],
    impact: ["Real-time predictions", "340% ROI", "Explainable AI"],
    category: "Data",
  },
  {
    icon: Brain,
    title: "AI Agents",
    problem: "Repetitive knowledge work consumes expert bandwidth that should be used for high-leverage decisions.",
    solution: "Multi-agent orchestration systems that decompose complex tasks, execute autonomously, and report with evidence.",
    stack: ["Python", "LangChain", "Redis", "FastAPI", "React"],
    impact: ["80% automation rate", "24/7 operation", "Human-in-loop"],
    category: "Automation",
    color: "#10B981",
  },
];

export function Solutions() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeFilter === "All" ? solutions : solutions.filter((s) => s.category === activeFilter);

  return (
    <section id="solutions" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              05 — Business Solutions
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Not services.{" "}
            <span className="text-[rgba(245,246,247,0.38)]">Engineered outcomes.</span>
          </h2>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap gap-2 mb-10"
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase transition-all duration-150 ${
                activeFilter === f
                  ? "bg-[#10B981] text-[#070709] font-semibold"
                  : "border border-white/[0.08] text-[rgba(245,246,247,0.38)] hover:border-white/[0.15] hover:text-[rgba(245,246,247,0.64)]"
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s, i) => {
            const Icon = s.icon;
            const isExpanded = expanded === s.title;
            const color = s.color ?? "#818CF8";

            return (
              <motion.div
                key={s.title}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="group relative rounded-xl border border-white/[0.06] bg-[rgba(13,15,18,0.6)] backdrop-blur-sm overflow-hidden hover:border-white/[0.12] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_24px_64px_rgba(0,0,0,0.3)] transition-all duration-300"
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.title)}
                  className="w-full text-left p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-lg mt-0.5 flex-shrink-0" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#F5F6F7] mb-1 group-hover:text-[#F5F6F7] transition-colors">
                          {s.title}
                        </h3>
                        <p className="text-sm text-[rgba(245,246,247,0.38)] leading-snug">{s.problem}</p>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-[rgba(245,246,247,0.22)] flex-shrink-0 mt-1" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="px-6 pb-6 space-y-5 border-t border-white/[0.04]"
                  >
                    <div className="pt-4">
                      <div className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)] mb-2">SOLUTION</div>
                      <p className="text-sm text-[rgba(245,246,247,0.55)] leading-relaxed">{s.solution}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)] mb-2">STACK</div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.stack.map((t) => (
                          <span key={t} className="px-2 py-0.5 text-xs font-mono rounded border border-white/[0.06] text-[rgba(245,246,247,0.38)]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)] mb-2">IMPACT</div>
                      <div className="space-y-1">
                        {s.impact.map((imp) => (
                          <div key={imp} className="flex items-center gap-2 text-sm font-mono" style={{ color }}>
                            <span className="opacity-40">▸</span>
                            <span className="text-[#F5F6F7]">{imp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <a
                      href="#contact"
                      className="inline-flex items-center gap-1.5 text-sm font-mono transition-colors"
                      style={{ color }}
                    >
                      Discuss this solution →
                    </a>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Soft CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 p-6 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <p className="text-[rgba(245,246,247,0.55)] text-sm">Not sure which solution fits your needs?</p>
          <a
            href="#contact"
            className="px-5 py-2.5 rounded-lg bg-[#10B981] text-[#070709] text-sm font-semibold hover:bg-[#0ea571] transition-colors flex-shrink-0"
          >
            Talk to an engineer
          </a>
        </motion.div>
      </div>
    </section>
  );
}
