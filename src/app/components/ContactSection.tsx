import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

function SubtleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type NodeT = { x: number; y: number; vx: number; vy: number };
    const nodes: NodeT[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.08;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(31,174,110,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(31,174,110,0.15)";
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export function ContactSection() {
  return (
    <section
      className="relative py-36 lg:py-48 overflow-hidden"
      style={{ background: "#07130F" }}
    >
      <SubtleNetwork />

      {/* Radial depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(31,174,110,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-12 text-center">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="w-6 h-px bg-[#1FAE6E]" />
          <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
            Contact · 06
          </span>
          <div className="w-6 h-px bg-[#1FAE6E]" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.07 }}
          className="text-[clamp(2.5rem,6vw,5.5rem)] font-medium tracking-tight text-[#F3FAF6] leading-[0.95] mb-6"
        >
          Have a difficult<br />
          <span className="text-[#1FAE6E]">problem?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-lg text-[rgba(243,250,246,0.5)] max-w-[42ch] mx-auto leading-relaxed mb-12"
        >
          Tell us what you're trying to build.<br />
          We'll figure out the system together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/contact"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-[#1FAE6E] text-[#07130F] rounded-lg font-semibold hover:bg-[#35C98A] transition-all duration-150"
          >
            Start a conversation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-8 py-4 border border-[rgba(31,174,110,0.2)] rounded-lg text-[rgba(243,250,246,0.55)] font-mono text-sm hover:border-[rgba(31,174,110,0.4)] hover:text-[#F3FAF6] transition-all duration-150"
          >
            See our work first
          </Link>
        </motion.div>

        {/* Technical metadata strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="mt-20 flex items-center justify-center gap-8 flex-wrap"
        >
          {[
            { label: "Location", value: "Tehran, IR" },
            { label: "Response time", value: "< 24h" },
            { label: "Languages", value: "EN · FA" },
            { label: "Status", value: "Accepting projects" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-[9px] font-mono text-[rgba(243,250,246,0.2)] tracking-widest uppercase mb-1">
                {item.label}
              </div>
              <div className="text-xs font-mono text-[rgba(243,250,246,0.45)]">
                {item.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
