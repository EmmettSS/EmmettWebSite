import { motion } from "motion/react";

export function Manifesto() {
  return (
    <section id="manifesto" className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(12,10,18,1)_0%,rgba(7,7,9,1)_100%)]" />

      <div className="max-w-[760px] mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-16"
        >
          <div className="w-6 h-px bg-[rgba(245,246,247,0.12)]" />
          <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.28)]">
            Who We Are
          </span>
        </motion.div>

        <div className="space-y-8">
          {[
            { text: "We don't build websites.", delay: 0.1 },
            { text: "We engineer intelligent systems.", delay: 0.18, accent: true },
            { text: "Every architecture is a strategic act.", delay: 0.26 },
          ].map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: line.delay }}
              className={`text-[clamp(1.5rem,3.5vw,2.5rem)] font-medium leading-[1.2] tracking-tight ${
                line.accent ? "text-[#F5F6F7]" : "text-[rgba(245,246,247,0.4)]"
              }`}
            >
              {line.accent ? (
                <>
                  We engineer{" "}
                  <span className="text-[#10B981]">intelligent systems.</span>
                </>
              ) : line.text}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
