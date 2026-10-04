import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** اسکلت بارگذاری — باید دقیقاً هندسهٔ محتوای واقعی را تقلید کند (طبق اسپک Card). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
