import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * برچسب — برای وضعیت‌ها/متادیتای کوتاه (مثل «LEVEL: INTERMEDIATE» در اسپک
 * طراحی). فونت مونو برای حالت `technical` مطابق توکن `type/technical`.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-secondary text-secondary-foreground",
        accent: "bg-accent text-accent-foreground",
        outline: "border border-border text-foreground",
        technical:
          "border border-border font-technical uppercase tracking-[0.04em] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
