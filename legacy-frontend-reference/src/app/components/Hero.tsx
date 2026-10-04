import { motion } from "motion/react";
import { Link } from "react-router";
import { NeuralNetwork3D } from "./NeuralNetwork3D";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #07130F 0%, #0B1F18 60%, #102A20 100%)" }}
    >
      {/* Subtle grid — emerald tint */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(31,174,110,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,174,110,0.04) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_55%_40%,rgba(31,174,110,0.05)_0%,transparent_70%)]" />

      <div className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)]">

          {/* Left — Content */}
          <div className="flex flex-col justify-center space-y-9">

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-px bg-[#1FAE6E]" />
              <span className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
                Engineering Collective · University of Tehran
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="text-[clamp(2.8rem,7vw,6.5rem)] font-medium leading-[0.95] tracking-tight text-[#F3FAF6]"
            >
              We engineer<br />
              <span className="text-[#1FAE6E]">intelligent</span><br />
              systems.
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-[rgba(243,250,246,0.62)] max-w-[44ch] leading-relaxed"
            >
              Software, AI, cybersecurity and products built for real-world complexity.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                to="/projects"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-[#1FAE6E] text-[#07130F] rounded-lg font-semibold text-sm hover:bg-[#35C98A] transition-all duration-150"
              >
                Explore our work
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-[rgba(31,174,110,0.25)] rounded-lg text-[rgba(243,250,246,0.65)] text-sm font-mono hover:border-[rgba(31,174,110,0.5)] hover:text-[#F3FAF6] hover:bg-[rgba(31,174,110,0.06)] transition-all duration-150"
              >
                Start a project
              </Link>
            </motion.div>

            {/* Technical stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex items-center gap-10 pt-2 border-t border-[rgba(31,174,110,0.12)]"
            >
              {[
                { value: "40+", label: "Systems Shipped" },
                { value: "99.97%", label: "Uptime SLA" },
                { value: "12", label: "Countries" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-semibold font-mono text-[#F3FAF6]">{s.value}</span>
                  <span className="text-[10px] text-[rgba(243,250,246,0.35)] uppercase tracking-[0.15em] font-mono">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Neural Network */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.05 }}
            className="relative h-[460px] lg:h-[580px] hidden lg:block"
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-[rgba(31,174,110,0.1)] bg-[rgba(7,19,15,0.5)]">
              <NeuralNetwork3D />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07130F]/60 via-transparent to-transparent pointer-events-none" />

              {/* Technical labels floating on canvas */}
              <div className="absolute top-10 left-8 font-mono text-[10px] text-[rgba(31,174,110,0.45)] tracking-widest uppercase">AI / ML</div>
              <div className="absolute top-1/3 right-8 font-mono text-[10px] text-[rgba(77,155,232,0.4)] tracking-widest uppercase">Security</div>
              <div className="absolute bottom-20 left-12 font-mono text-[10px] text-[rgba(31,174,110,0.35)] tracking-widest uppercase">Backend</div>
              <div className="absolute bottom-10 right-10 font-mono text-[10px] text-[rgba(243,250,246,0.2)] tracking-[0.08em]">v4.1.2 · live</div>
            </div>

            {/* System status badge */}
            <div className="absolute top-5 right-5 px-3 py-1.5 rounded-md bg-[rgba(31,174,110,0.07)] border border-[rgba(31,174,110,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1FAE6E] animate-pulse" />
                <span className="text-[10px] font-mono text-[rgba(31,174,110,0.7)] tracking-widest uppercase">Systems Online</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border border-[rgba(31,174,110,0.2)] flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-0.5 h-2 rounded-full bg-[rgba(31,174,110,0.4)]"
          />
        </motion.div>
        <span className="text-[10px] font-mono text-[rgba(243,250,246,0.2)] tracking-widest uppercase">scroll</span>
      </motion.div>
    </section>
  );
}
