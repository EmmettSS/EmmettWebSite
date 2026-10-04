"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** پخش روی ورود به viewport (برای بخش‌های پایین‌تر از صفحه) یا بلافاصله روی mount (Hero). */
  on?: "mount" | "view";
}

/**
 * پیاده‌سازی موشن استاندارد پروژه: fade + ۱۲px translate-up، مدت
 * motion/base (۲۵۰–۴۰۰ms)، easing اختصاصی برند (طبق بخش H اسپک طراحی).
 * با `prefers-reduced-motion` به‌طور کامل غیرفعال می‌شود (فقط تغییر opacity
 * آنی، بدون transform) — قانون ۱۸/۱۹.
 */
export function FadeIn({ children, delay = 0, className, on = "view" }: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={on === "mount" ? "visible" : undefined}
      whileInView={on === "view" ? "visible" : undefined}
      viewport={on === "view" ? { once: true, margin: "-80px" } : undefined}
      variants={variants}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.4,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
