import { motion } from "motion/react";

const principles = [
  {
    index: "01",
    title: "Engineering Excellence",
    description: "No decorative element exists without a functional justification. If a glow doesn't communicate state, remove it.",
    accent: "text-[#10B981]",
    border: "border-[rgba(16,185,129,0.2)]",
  },
  {
    index: "02",
    title: "Research Driven",
    description: "Every system begins as a research question. We build what we've proven, not what sounds impressive.",
    accent: "text-[#22D3EE]",
    border: "border-[rgba(34,211,238,0.2)]",
  },
  {
    index: "03",
    title: "Security by Design",
    description: "Security is not a feature added at the end. It is an architectural constraint present from the first commit.",
    accent: "text-[#22D3EE]",
    border: "border-[rgba(34,211,238,0.2)]",
  },
  {
    index: "04",
    title: "AI Native",
    description: "Intelligent behavior is a baseline, not a premium tier. Every system we build is designed to learn and adapt.",
    accent: "text-[#10B981]",
    border: "border-[rgba(16,185,129,0.2)]",
  },
  {
    index: "05",
    title: "Human Centered",
    description: "Despite the technical tone, usability and clarity must remain comfortable. Coldness is aesthetic, not functional.",
    accent: "text-[#818CF8]",
    border: "border-[rgba(129,140,248,0.2)]",
  },
  {
    index: "06",
    title: "Scalable Architecture",
    description: "Systems must survive an order-of-magnitude increase in load without a rewrite. Design for ten times, build for one.",
    accent: "text-[#818CF8]",
    border: "border-[rgba(129,140,248,0.2)]",
  },
  {
    index: "07",
    title: "Continuous Innovation",
    description: "We reserve deliberate space for exploration. Every release includes something we have never done before.",
    accent: "text-[#10B981]",
    border: "border-[rgba(16,185,129,0.2)]",
  },
  {
    index: "08",
    title: "Minimalism with Precision",
    description: "Every spacing value maps to the 8pt scale. No arbitrary padding. No decoration without function.",
    accent: "text-[#22D3EE]",
    border: "border-[rgba(34,211,238,0.2)]",
  },
];

export function Dashboard() {
  return (
    <section id="philosophy" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(139,92,246,0.04),transparent_55%)]" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              03 — Engineering Philosophy
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium leading-tight tracking-tight text-[#F5F6F7] max-w-2xl">
            Principles that drive every{" "}
            <span className="text-[rgba(245,246,247,0.38)]">architectural decision</span>
          </h2>
        </motion.div>

        {/* Principles grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {principles.map((p, i) => (
            <motion.div
              key={p.index}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`group relative p-6 rounded-xl border ${p.border} bg-[rgba(13,15,18,0.6)] backdrop-blur-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_24px_64px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300`}
            >
              <div className={`text-3xl font-mono font-semibold ${p.accent} mb-5 opacity-30 group-hover:opacity-60 transition-opacity`}>
                {p.index}
              </div>
              <h3 className={`text-base font-semibold ${p.accent} mb-3`}>{p.title}</h3>
              <p className="text-sm text-[rgba(245,246,247,0.38)] leading-relaxed group-hover:text-[rgba(245,246,247,0.55)] transition-colors">
                {p.description}
              </p>

              {/* accent underline */}
              <div className={`absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity ${p.accent}`} />
            </motion.div>
          ))}
        </div>

        {/* Soft CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <a
            href="#projects"
            className="text-sm text-[rgba(245,246,247,0.38)] hover:text-[#10B981] transition-colors font-mono"
          >
            See how this becomes real work → Case Studies
          </a>
        </motion.div>
      </div>
    </section>
  );
}
