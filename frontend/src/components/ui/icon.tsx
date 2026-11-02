import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "ref"> {
  icon: LucideIcon;
  size?: keyof typeof sizeMap;
  /** برچسب در دسترس؛ اگر داده نشود آیکون تزئینی فرض می‌شود (aria-hidden). */
  label?: string;
}

/**
 * یک wrapper نازک دور آیکون‌های `lucide-react` برای یکنواختی سایز/stroke و
 * رعایت دسترس‌پذیری (قانون ۱۸): بدون `label`، آیکون از ساختار درخت دسترس‌پذیری
 * حذف می‌شود؛ با `label`، به‌عنوان تصویر معنادار معرفی می‌شود.
 */
export function Icon({
  icon: LucideIconComponent,
  size = "md",
  label,
  className,
  ...props
}: IconProps) {
  return (
    <LucideIconComponent
      className={cn(sizeMap[size], className)}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      {...props}
    />
  );
}
