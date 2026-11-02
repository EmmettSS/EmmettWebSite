"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

import { prefersReducedMotion } from "./reduced-motion";

function SubtleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    const reduced = prefersReducedMotion();
    let draw = () => {};

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (reduced) draw();
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

    draw = () => {
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
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.08;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
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

      if (!reduced) frameId = requestAnimationFrame(draw);
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
  const t = useTranslations("ui.contact");

  return (
    <section
      className="relative py-36 lg:py-48 overflow-hidden"
      style={{ background: "var(--deep-green-black)" }}
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
          <div className="w-6 h-px bg-primary" />
          <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
            {t("eyebrow")}
          </span>
          <div className="w-6 h-px bg-primary" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.07 }}
          className="text-[clamp(2.5rem,6vw,5.5rem)] font-medium tracking-tight text-foreground leading-[0.95] mb-6"
        >
          {t("line1")}
          <br />
          <span className="text-primary">{t("accent")}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-lg text-muted-on-dark max-w-[42ch] mx-auto leading-relaxed mb-12"
        >
          {t("lead1")}
          <br />
          {t("lead2")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-accent transition-all duration-150"
          >
            {t("start")}
            <ArrowRight className="w-4 h-4 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-8 py-4 border border-[rgba(31,174,110,0.2)] rounded-lg text-muted-on-dark font-mono text-sm hover:border-[rgba(31,174,110,0.4)] hover:text-foreground transition-all duration-150"
          >
            {t("work")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
