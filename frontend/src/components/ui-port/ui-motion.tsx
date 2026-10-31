"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** انیمیشن‌های `motion` پوسته از تنظیم سیستم پیروی می‌کنند. */
export function UiMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
