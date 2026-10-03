import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function ComingSoon({ page, subtitle }: { page: string; subtitle: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: "#07130F" }}
    >
      {/* Subtle emerald grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(31,174,110,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,174,110,0.04) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(31,174,110,0.12)] bg-[rgba(31,174,110,0.03)] mb-8">
          <div className="w-1 h-1 rounded-full bg-[#1FAE6E]" />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[rgba(31,174,110,0.55)]">
            Phase 2 · Pending
          </span>
        </div>

        <h1 className="text-5xl font-medium text-[#F3FAF6] mb-3 tracking-tight">{page}</h1>
        <p className="text-[rgba(243,250,246,0.38)] font-mono text-sm mb-10">{subtitle}</p>

        <div
          className="p-6 rounded-xl border border-[rgba(31,174,110,0.1)] mb-10"
          style={{ background: "rgba(11,31,24,0.5)" }}
        >
          <p className="text-sm text-[rgba(243,250,246,0.38)] leading-relaxed">
            This page is part of the Emmett digital ecosystem and will be implemented in a future phase,
            following review and approval of the Home experience.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-mono text-[rgba(243,250,246,0.38)] hover:text-[#1FAE6E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
}
