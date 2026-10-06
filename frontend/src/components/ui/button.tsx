import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * دکمه — طبق «PART F — Component System / Button» سند مشخصات طراحی.
 * متغیرها: Primary (پرشدهٔ ایندیگو) / Secondary (خط‌دور hairline) / Ghost
 * (متن + زیرخط روی hover) / Icon (مربعی، radius/sm).
 * حالت‌ها: Default/Hover/Active/Focus/Disabled/Loading — Loading برچسب را با
 * اسپینر جایگزین می‌کند بدون تغییر عرض دکمه.
 *
 * نکتهٔ RTL/LTR (قانون ۱۱): چیدمان با flex+gap است، نه margin-left/right
 * دستی؛ جهت به‌صورت خودکار از `dir` سند پیروی می‌کند، بدون هیچ CSS hack.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-[0.01em] transition-colors duration-fast ease-emmett-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-40 min-h-11 px-4 py-3",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:shadow-glow-cta active:scale-[0.98]",
        secondary:
          "border border-border bg-transparent text-foreground hover:border-primary active:scale-[0.98]",
        ghost:
          "bg-transparent text-foreground underline-offset-4 hover:underline active:scale-[0.98]",
        icon: "size-11 rounded-sm bg-transparent text-foreground hover:bg-secondary active:scale-[0.98] px-0 py-0",
      },
      size: {
        default: "",
        sm: "min-h-9 px-3 py-2 text-sm",
        lg: "min-h-13 px-6 py-3.5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading || undefined}
        data-slot="button"
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
