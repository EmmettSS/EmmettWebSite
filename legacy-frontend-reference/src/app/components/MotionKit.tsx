import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export function AmbientBackground() {
  return (
    <div className="ambient pointer-events-none fixed inset-0" aria-hidden>
      <ParticleNetwork />
      <div className="emerald-grid absolute inset-0" />
      <div className="data-streams absolute inset-0" />
      <motion.div
        className="orb absolute -left-40 top-20 h-[30rem] w-[30rem]"
        animate={{ x: [0, 52, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb absolute -right-48 top-[45%] h-[34rem] w-[34rem]"
        animate={{ x: [0, -45, 0], y: [0, 32, 0], scale: [1.05, 0.94, 1.05] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="noise absolute inset-0" />
    </div>
  );
}

function ParticleNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    if (!c || reduce) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0,
      lastFrame = 0;
    let points: { x: number; y: number; vx: number; vy: number }[] = [];
    const resize = () => {
      const d = Math.min(devicePixelRatio, 1.25);
      c.width = innerWidth * d;
      c.height = innerHeight * d;
      c.style.width = innerWidth + "px";
      c.style.height = innerHeight + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const count = innerWidth < 768 ? 10 : 26;
      points = Array.from({ length: count }, () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
      }));
    };
    resize();
    addEventListener("resize", resize, { passive: true });
    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || time - lastFrame < 33) return;
      lastFrame = time;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      points.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
        ctx.fillStyle = "rgba(69,233,155,.2)";
        ctx.fillRect(p.x, p.y, 1.1, 1.1);
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j],
            dx = p.x - q.x,
            dy = p.y - q.y,
            d2 = dx * dx + dy * dy;
          if (d2 < 16900) {
            ctx.strokeStyle = `rgba(53,201,138,${(1 - Math.sqrt(d2) / 130) * 0.07})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      });
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, [reduce]);
  return <canvas ref={ref} className="absolute inset-0 opacity-70" />;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GlowCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(50),
    y = useMotionValue(50);
  const rotateX = useSpring(useTransform(y, [0, 100], [2.4, -2.4]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(x, [0, 100], [-2.4, 2.4]), {
    stiffness: 180,
    damping: 22,
  });
  return (
    <motion.div
      ref={ref}
      style={
        {
          rotateX,
          rotateY,
          "--mx": `${x.get()}%`,
          "--my": `${y.get()}%`,
        } as any
      }
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width) * 100);
        y.set(((e.clientY - r.top) / r.height) * 100);
      }}
      onMouseLeave={() => {
        x.set(50);
        y.set(50);
      }}
      className={`glow-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Magnetic({
  children,
  strength = 10,
}: {
  children: ReactNode;
  strength?: number;
}) {
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 }),
    sy = useSpring(y, { stiffness: 260, damping: 18 });
  return (
    <motion.span
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left - r.width / 2) / r.width) * strength);
        y.set(((e.clientY - r.top - r.height / 2) / r.height) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-flex"
    >
      {children}
    </motion.span>
  );
}

export function SignalRail() {
  return (
    <div
      className="signal-rail pointer-events-none relative h-px w-full overflow-hidden bg-[var(--line)]"
      aria-hidden
    >
      <motion.i
        className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-[var(--bright)] to-transparent"
        animate={{ x: ["-15vw", "115vw"] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
