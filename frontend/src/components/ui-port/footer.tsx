"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { prefersReducedMotion } from "./reduced-motion";

function EmeraldStarfield() {
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

    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 0.8,
      speed: 0.02 + Math.random() * 0.07,
      opacity: 0.05 + Math.random() * 0.18,
    }));

    let shootingStarTimer = 0;
    let shootingStar: { x: number; y: number; len: number; speed: number; opacity: number } | null =
      null;
    let nextShoot = 22 + Math.random() * 14;

    draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243,250,246,${s.opacity})`;
        ctx.fill();
        s.x -= s.speed * 0.1;
        if (s.x < 0) s.x = canvas.width;
      }

      shootingStarTimer += 0.016;
      if (shootingStarTimer > nextShoot && !shootingStar) {
        shootingStar = {
          x: Math.random() * canvas.width * 0.7,
          y: Math.random() * canvas.height * 0.4,
          len: 60 + Math.random() * 80,
          speed: 5,
          opacity: 0.7,
        };
        nextShoot = 22 + Math.random() * 14;
        shootingStarTimer = 0;
      }

      if (shootingStar) {
        ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(shootingStar.x + shootingStar.len, shootingStar.y + shootingStar.len * 0.4);
        ctx.strokeStyle = `rgba(31,174,110,${shootingStar.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        shootingStar.x += shootingStar.speed;
        shootingStar.y += shootingStar.speed * 0.4;
        shootingStar.opacity -= 0.025;
        if (shootingStar.opacity <= 0) shootingStar = null;
      }

      if (!reduced) frameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full" />;
}

type FooterColumn = { header: string; links: Array<{ label: string; href: string }> };

export function Footer() {
  const t = useTranslations("ui.footer");
  const brand = useTranslations("ui");
  const columns = t.raw("columns") as FooterColumn[];

  return (
    <footer
      className="relative border-t border-[rgba(31,174,110,0.08)] overflow-hidden"
      style={{ background: "var(--deep-green-black)" }}
    >
      <EmeraldStarfield />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-12 pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-20">
          {columns
            .map((column) => ({
              ...column,
              links: column.links.filter((link) => link.href !== "#"),
            }))
            .filter((column) => column.links.length > 0)
            .map((col) => (
              <div key={col.header}>
                <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[rgba(243,250,246,0.2)] mb-5">
                  {col.header}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href as "/"}
                        className="text-sm text-[rgba(243,250,246,0.35)] hover:text-[rgba(243,250,246,0.7)] transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-end gap-6 pt-8 border-t border-[rgba(31,174,110,0.08)]">
          <span className="text-xs font-mono text-[rgba(243,250,246,0.22)]">
            {t("copyright", { year: new Date().getFullYear() })}
          </span>
        </div>

        <div className="mt-16 font-mono text-[clamp(4rem,15vw,12rem)] font-bold leading-none text-[rgba(31,174,110,0.04)] tracking-[0.05em] select-none">
          {brand("brand")}
        </div>
      </div>
    </footer>
  );
}
