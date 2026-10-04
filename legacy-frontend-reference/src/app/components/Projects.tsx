import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";

function CountUp({ to, suffix = "", duration = 900 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const update = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * to));
      if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [inView, to, duration]);

  return <span ref={ref}>{value}{suffix}</span>;
}

const caseStudies = [
  {
    number: "01",
    title: "Advanced Network Security System",
    outcome: "Top 20 Network Security Project — Tehran Science & Technology Park",
    metrics: [
      { label: "Threats Blocked", value: 1, suffix: "M+" },
      { label: "Detection Speed", value: 50, suffix: "ms" },
      { label: "Accuracy", value: 99.7, suffix: "%" },
    ],
    tags: ["Cybersecurity", "Infrastructure", "AI"],
    color: "#22D3EE",
    challenges: ["Distributed detection across 40+ network segments", "Sub-100ms response requirement at scale"],
    stack: ["Rust", "Go", "Kafka", "PostgreSQL"],
  },
  {
    number: "02",
    title: "Real-time AI Analytics Platform",
    outcome: "Distributed ML pipeline processing millions of events with sub-second inference",
    metrics: [
      { label: "Events/sec", value: 2, suffix: "M+" },
      { label: "Inference Latency", value: 800, suffix: "ms" },
      { label: "Model Accuracy", value: 95.2, suffix: "%" },
    ],
    tags: ["AI", "Backend", "Real-time"],
    color: "#10B981",
    challenges: ["Sub-second inference on 2M events/sec", "Model drift detection in production"],
    stack: ["Python", "PyTorch", "Kafka", "Redis"],
  },
  {
    number: "03",
    title: "Immersive 3D Data Visualization",
    outcome: "Interactive WebGL platform for complex infrastructure topology analysis",
    metrics: [
      { label: "Nodes Rendered", value: 10, suffix: "K+" },
      { label: "Frame Rate", value: 60, suffix: "fps" },
      { label: "Load Time", value: 2, suffix: "s" },
    ],
    tags: ["Frontend", "3D", "WebGL"],
    color: "#818CF8",
    challenges: ["10K+ node graphs at 60fps", "Mobile GPU budget constraints"],
    stack: ["Three.js", "WebGL", "React", "TypeScript"],
  },
];

export function Projects() {
  return (
    <section id="projects" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:6rem_6rem]" />

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
              06 — Case Studies
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Proof in production,{" "}
            <span className="text-[rgba(245,246,247,0.38)]">not in slides</span>
          </h2>
        </motion.div>

        <div className="space-y-6">
          {caseStudies.map((cs, index) => (
            <motion.div
              key={cs.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl border border-white/[0.06] bg-[rgba(13,15,18,0.6)] backdrop-blur-sm hover:border-white/[0.12] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_24px_64px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-[rgba(245,246,247,0.22)] mt-1">{cs.number}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[#F5F6F7] mb-1">{cs.title}</h3>
                      <p className="text-sm font-mono" style={{ color: cs.color }}>{cs.outcome}</p>
                    </div>
                  </div>

                  {/* Metrics — count up */}
                  <div className="grid grid-cols-3 gap-4">
                    {cs.metrics.map((m) => (
                      <div key={m.label} className="space-y-1">
                        <div className="text-2xl font-mono font-semibold text-[#F5F6F7]">
                          <CountUp to={m.value} suffix={m.suffix} />
                        </div>
                        <div className="text-xs text-[rgba(245,246,247,0.38)] font-mono uppercase tracking-widest">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Challenges */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">Key Challenges</div>
                    {cs.challenges.map((c) => (
                      <div key={c} className="flex items-center gap-2 text-sm text-[rgba(245,246,247,0.38)]">
                        <span style={{ color: cs.color }} className="opacity-50">▸</span>
                        {c}
                      </div>
                    ))}
                  </div>

                  {/* Stack + Tags */}
                  <div className="flex flex-wrap gap-2">
                    {cs.tags.map((t) => (
                      <span key={t} className="px-2.5 py-1 text-xs font-mono rounded-full border border-white/[0.06] text-[rgba(245,246,247,0.38)]">
                        {t}
                      </span>
                    ))}
                    {cs.stack.map((t) => (
                      <span key={t} className="px-2.5 py-1 text-xs font-mono rounded-full text-[rgba(245,246,247,0.22)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col items-end justify-start gap-3 pt-1">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-all duration-150 opacity-0 group-hover:opacity-100"
                    style={{ borderColor: `${cs.color}35`, color: cs.color }}
                  >
                    Start yours →
                  </a>
                </div>
              </div>

              {/* Accent bar */}
              <div
                className="absolute left-0 top-8 bottom-8 w-0.5 rounded-full opacity-40"
                style={{ backgroundColor: cs.color }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
