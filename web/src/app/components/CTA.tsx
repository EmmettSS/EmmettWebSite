import { motion } from "motion/react";
import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

const projectTypes = [
  { id: "ai", label: "AI Systems", color: "#10B981" },
  { id: "security", label: "Cybersecurity", color: "#22D3EE" },
  { id: "infra", label: "Infrastructure", color: "#818CF8" },
  { id: "frontend", label: "Frontend / UI", color: "#818CF8" },
  { id: "research", label: "Research", color: "#10B981" },
  { id: "other", label: "Other", color: "#F59E0B" },
];

export function CTA() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(139,92,246,0.03)] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.04),transparent_60%)]" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — Reassurance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
                <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
                  14 — Contact
                </span>
              </div>
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7]">
                Let's engineer<br />
                <span className="text-[rgba(245,246,247,0.38)]">something real</span>
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { label: "Response Time", value: "< 24 hours" },
                { label: "NDA", value: "Available on request" },
                { label: "First step", value: "Free technical scoping call" },
                { label: "Location", value: "University of Tehran · Remote" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
                  <span className="text-xs font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">{item.label}</span>
                  <span className="text-sm font-mono text-[rgba(245,246,247,0.64)]">{item.value}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)] mb-2">Direct Contact</p>
              <button
                onClick={() => navigator.clipboard?.writeText("contact@emmettgroup.tech")}
                className="font-mono text-sm text-[#10B981] hover:text-[#0ea571] transition-colors group"
                title="Click to copy"
              >
                contact@emmettgroup.tech
                <span className="ml-2 text-[rgba(245,246,247,0.22)] text-xs opacity-0 group-hover:opacity-100 transition-opacity">copy</span>
              </button>
            </div>
          </motion.div>

          {/* Right — Terminal Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="rounded-xl border border-white/[0.08] bg-[rgba(13,15,18,0.8)] backdrop-blur-xl overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/40" />
                <span className="ml-3 text-xs font-mono text-[rgba(245,246,247,0.22)]">emmett-group — new-project</span>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 text-center space-y-4"
                >
                  <CheckCircle className="w-10 h-10 text-[#10B981] mx-auto" />
                  <p className="font-mono text-[#F5F6F7]">Message received.</p>
                  <p className="font-mono text-sm text-[rgba(245,246,247,0.38)]">We'll respond within 24 hours.</p>
                  <a href="#" className="inline-block text-xs font-mono text-[#10B981] mt-2">book a call instead →</a>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">&gt; NAME</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Your full name"
                      className="w-full bg-transparent border-b border-white/[0.08] py-2 text-sm font-mono text-[rgba(245,246,247,0.64)] placeholder:text-[rgba(245,246,247,0.18)] outline-none focus:border-[#10B981] transition-colors"
                    />
                  </div>

                  {/* Company */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">&gt; COMPANY</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Organization (optional)"
                      className="w-full bg-transparent border-b border-white/[0.08] py-2 text-sm font-mono text-[rgba(245,246,247,0.64)] placeholder:text-[rgba(245,246,247,0.18)] outline-none focus:border-[#10B981] transition-colors"
                    />
                  </div>

                  {/* Project type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">&gt; PROJECT TYPE</label>
                    <div className="grid grid-cols-3 gap-2">
                      {projectTypes.map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setSelectedType(selectedType === pt.id ? null : pt.id)}
                          className="py-2 px-2 rounded-lg border text-xs font-mono transition-all duration-150 text-left"
                          style={{
                            borderColor: selectedType === pt.id ? pt.color : "rgba(255,255,255,0.06)",
                            backgroundColor: selectedType === pt.id ? `${pt.color}10` : "transparent",
                            color: selectedType === pt.id ? pt.color : "rgba(245,246,247,0.38)",
                          }}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-widest uppercase text-[rgba(245,246,247,0.22)]">&gt; MESSAGE</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      rows={4}
                      placeholder="Describe your project or challenge…"
                      className="w-full bg-transparent border-b border-white/[0.08] py-2 text-sm font-mono text-[rgba(245,246,247,0.64)] placeholder:text-[rgba(245,246,247,0.18)] outline-none focus:border-[#10B981] transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 rounded-lg bg-[#10B981] text-[#070709] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0ea571] hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] transition-all duration-150"
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
