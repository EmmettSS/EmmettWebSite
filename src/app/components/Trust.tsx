import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";

function CountUpStat({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
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
    const duration = 900;
    const update = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((ease * to).toFixed(decimals)));
      if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [inView, to, decimals]);

  return <span ref={ref}>{prefix}{decimals > 0 ? value.toFixed(decimals) : value}{suffix}</span>;
}

const stats: { value: number; suffix: string; label: string; decimals?: number }[] = [
  { value: 40, suffix: "+", label: "Systems Shipped" },
  { value: 99.97, suffix: "%", label: "Uptime SLA", decimals: 2 },
  { value: 12, suffix: "", label: "Countries" },
  { value: 5, suffix: "+", label: "Years Research" },
];

const pillars = [
  { label: "Research Driven" },
  { label: "AI Native" },
  { label: "Security Focused" },
  { label: "Open Standards" },
  { label: "Scalable Systems" },
  { label: "Innovation First" },
  { label: "Human Centered" },
];

export function Trust() {
  return (
    <section id="trust" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.04),transparent_50%)]" />

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
              12 — Trust & Credibility
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Numbers that{" "}
            <span className="text-[rgba(245,246,247,0.38)]">don't require footnotes</span>
          </h2>
        </motion.div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden mb-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#070709] px-8 py-10"
            >
              <div className="text-[2.5rem] font-mono font-semibold text-[#F5F6F7] mb-2 leading-none">
                <CountUpStat to={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div className="text-xs font-mono tracking-widest uppercase text-[rgba(245,246,247,0.38)]">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Pillars */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap gap-2"
        >
          {pillars.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group px-4 py-2 rounded-full border border-white/[0.06] hover:border-[rgba(16,185,129,0.25)] hover:bg-[rgba(16,185,129,0.04)] transition-all duration-150 cursor-default"
            >
              <span className="text-sm font-mono text-[rgba(245,246,247,0.38)] group-hover:text-[rgba(245,246,247,0.64)] transition-colors">
                {p.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
