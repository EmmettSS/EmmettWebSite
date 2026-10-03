import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export function HomeCTA() {
  return (
    <section className="relative py-40 overflow-hidden">

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-px bg-[rgba(245,246,247,0.2)]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-[rgba(245,246,247,0.38)]">
              Ready to build?
            </span>
          </div>

          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-tight text-[#F5F6F7] mb-8">
            They don't just build<br />
            the future.
            <br />
            <span className="text-[rgba(245,246,247,0.3)]">They engineer it.</span>
          </h2>

          <p className="text-[rgba(245,246,247,0.55)] leading-relaxed max-w-md mb-12">
            If you're building something that requires serious engineering — AI systems,
            secure infrastructure, or products that need to actually work at scale —
            let's talk.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="group inline-flex items-center gap-2 px-7 py-4 bg-[#10B981] text-[#070709] rounded-lg font-semibold text-sm hover:bg-[#0ea571] hover:shadow-[0_0_32px_rgba(16,185,129,0.35)] transition-all duration-150"
            >
              Start a Project
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-7 py-4 border border-white/[0.08] rounded-lg text-sm font-mono text-[rgba(245,246,247,0.55)] hover:border-white/[0.15] hover:text-[rgba(245,246,247,0.8)] transition-all duration-150"
            >
              Explore Services
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-7 py-4 border border-white/[0.08] rounded-lg text-sm font-mono text-[rgba(245,246,247,0.55)] hover:border-white/[0.15] hover:text-[rgba(245,246,247,0.8)] transition-all duration-150"
            >
              Explore Products
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
