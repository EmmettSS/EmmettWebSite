import { motion } from "motion/react";

const stages = [
  { n: "01", title: "Research", desc: "Deep technical investigation, literature review, and feasibility analysis.", duration: "1–2 weeks" },
  { n: "02", title: "Architecture", desc: "System design, component boundaries, and data flow specification.", duration: "1–3 weeks" },
  { n: "03", title: "Prototype", desc: "Working proof-of-concept validating critical technical assumptions.", duration: "1–2 weeks" },
  { n: "04", title: "Development", desc: "Production-grade implementation with test coverage and documentation.", duration: "4–12 weeks" },
  { n: "05", title: "Security Review", desc: "Threat modeling, penetration testing, and compliance verification.", duration: "1–2 weeks" },
  { n: "06", title: "AI Integration", desc: "Model training, evaluation, and integration into the production pipeline.", duration: "2–4 weeks" },
  { n: "07", title: "Testing", desc: "Load testing, chaos engineering, and end-to-end validation.", duration: "1–2 weeks" },
  { n: "08", title: "Deployment", desc: "Zero-downtime deployment, rollback planning, and runbook preparation.", duration: "1 week" },
  { n: "09", title: "Optimization", desc: "Performance profiling, caching strategies, and bottleneck elimination.", duration: "Ongoing" },
  { n: "10", title: "Monitoring", desc: "Observability setup, alerting, and continuous improvement loops.", duration: "Ongoing" },
];

export function Workflow() {
  return (
    <section id="workflow" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,0.03),transparent_60%)]" />

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
              11 — Engineering Workflow
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            How we build{" "}
            <span className="text-[rgba(245,246,247,0.38)]">what we promise</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/[0.04]" />

          <div className="space-y-2">
            {stages.map((stage, i) => (
              <motion.div
                key={stage.n}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group relative pl-16"
              >
                {/* Node */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 + 0.1 }}
                  className="absolute left-0 top-4 w-12 h-12 flex items-center justify-center"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[rgba(16,185,129,0.3)] border border-[rgba(16,185,129,0.5)] group-hover:bg-[#10B981] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all duration-200" />
                  </div>
                </motion.div>

                {/* Card */}
                <div className="flex items-start gap-6 p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs font-mono text-[rgba(245,246,247,0.22)] mt-1 flex-shrink-0 w-5">{stage.n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-[#F5F6F7] group-hover:text-[#10B981] transition-colors">
                        {stage.title}
                      </h3>
                      <span className="text-xs font-mono text-[rgba(245,246,247,0.22)]">{stage.duration}</span>
                    </div>
                    <p className="text-sm text-[rgba(245,246,247,0.38)] leading-relaxed">{stage.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
