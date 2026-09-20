import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, Shield, Activity } from "lucide-react";
import { useState, useEffect } from "react";

function LiveDot() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-1.5 h-1.5 rounded-full bg-[#10B981]"
    />
  );
}

function PentestorBay() {
  const findings = [
    { sev: "CRITICAL", label: "SQL Injection", port: "443/tcp" },
    { sev: "HIGH",     label: "XSS Reflected", port: "80/tcp" },
    { sev: "MEDIUM",   label: "SSL/TLS Weak Cipher", port: "443/tcp" },
    { sev: "LOW",      label: "HTTP Security Headers", port: "80/tcp" },
  ];

  const sevColor: Record<string, string> = {
    CRITICAL: "#EF4444",
    HIGH:     "#F59E0B",
    MEDIUM:   "#6366F1",
    LOW:      "rgba(245,246,247,0.38)",
  };

  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (visibleCount >= findings.length) return;
    const t = setTimeout(() => setVisibleCount((v) => v + 1), 900 + visibleCount * 600);
    return () => clearTimeout(t);
  }, [visibleCount]);

  const pct = Math.round((visibleCount / findings.length) * 100);

  return (
    <div className="relative p-5 rounded-xl border border-white/[0.07] bg-[#0D0F12] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#6366F1]" />
          <span className="text-xs font-mono text-[rgba(245,246,247,0.6)] tracking-widest uppercase">PenTestor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="text-[10px] font-mono text-[rgba(245,246,247,0.3)]">DEMO SCAN</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono text-[rgba(245,246,247,0.3)]">
          <span>scan progress</span>
          <span className="text-[#10B981]">{pct}%</span>
        </div>
        <div className="h-px bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full bg-[#10B981]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-1.5 min-h-[120px]">
        {findings.slice(0, visibleCount).map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-white/[0.025] border border-white/[0.04]"
          >
            <span
              className="text-[9px] font-mono font-semibold"
              style={{ color: sevColor[f.sev] }}
            >
              {f.sev}
            </span>
            <span className="text-xs font-mono text-[rgba(245,246,247,0.5)] flex-1">{f.label}</span>
            <span className="text-[10px] font-mono text-[rgba(245,246,247,0.2)]">{f.port}</span>
          </motion.div>
        ))}
        {visibleCount < findings.length && (
          <div className="py-1.5 px-2.5">
            <motion.span
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] font-mono text-[rgba(245,246,247,0.2)]"
            >
              analyzing target…
            </motion.span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-[rgba(245,246,247,0.18)]">
        <span>target: demo.emmett.lab</span>
        <span>simulated data</span>
      </div>
    </div>
  );
}

function CRMBay() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative p-5 rounded-xl border border-white/[0.07] bg-[#0D0F12] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#10B981]" />
          <span className="text-xs font-mono text-[rgba(245,246,247,0.6)] tracking-widest uppercase">CRM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="text-[10px] font-mono text-[rgba(245,246,247,0.3)]">DEMO</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Records",    value: 2847 + tick * 3, suffix: "",    color: "#F5F6F7" },
          { label: "Pipeline",   value: 142  + tick * 2, suffix: "K€",  color: "#10B981" },
          { label: "Open Tasks", value: Math.max(38 - tick, 12), suffix: "", color: "#F5F6F7" },
        ].map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="text-xl font-mono font-semibold" style={{ color: m.color }}>
              {m.value}{m.suffix}
            </div>
            <div className="text-[9px] font-mono text-[rgba(245,246,247,0.28)] leading-tight uppercase tracking-widest">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-[rgba(245,246,247,0.2)] uppercase tracking-widest mb-1">
          Recent Activity
        </div>
        {[
          { label: "Proposal sent",    time: "2m ago",  dot: "#10B981" },
          { label: "Demo scheduled",   time: "14m ago", dot: "#6366F1" },
          { label: "Contract signed",  time: "1h ago",  dot: "#10B981" },
        ].map((a, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1">
            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: a.dot }} />
            <span className="text-xs font-mono text-[rgba(245,246,247,0.38)] flex-1">{a.label}</span>
            <span className="text-[10px] font-mono text-[rgba(245,246,247,0.2)]">{a.time}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono text-[rgba(245,246,247,0.18)]">simulated demo data</div>
    </div>
  );
}

export function ProductLabTeaser() {
  return (
    <section className="relative py-40 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.12)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.3)]">
              The Product Lab
            </span>
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-xl">
            Products we built,{" "}
            <span className="text-[rgba(245,246,247,0.35)]">running now</span>
          </h2>
          <p className="mt-4 text-sm text-[rgba(245,246,247,0.38)] max-w-md leading-relaxed">
            Not mockups. Intelligent systems operating with real architecture.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <PentestorBay />
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold text-[#F5F6F7]">PenTestor</div>
                <div className="text-xs text-[rgba(245,246,247,0.35)] font-mono">Active penetration testing platform</div>
              </div>
              <Link
                to="/products/pentestor"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-[#6366F1] hover:text-[rgba(99,102,241,0.7)] transition-colors"
              >
                Enter <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="space-y-4"
          >
            <CRMBay />
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold text-[#F5F6F7]">CRM</div>
                <div className="text-xs text-[rgba(245,246,247,0.35)] font-mono">Intelligent relationship management</div>
              </div>
              <Link
                to="/products/crm"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-[#10B981] hover:text-[rgba(16,185,129,0.7)] transition-colors"
              >
                Enter <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            to="/products"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.07] text-sm font-mono text-[rgba(245,246,247,0.38)] hover:border-white/[0.14] hover:text-[rgba(245,246,247,0.65)] transition-all duration-200"
          >
            Enter the Product Lab
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
