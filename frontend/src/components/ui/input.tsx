import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ورودی متنی — طبق «Form Inputs» سند مشخصات طراحی: radius/sm، hairline
 * border، فوکوس = border ایندیگو + تغییر پس‌زمینهٔ ملایم.
 * `aria-invalid` به‌صورت خودکار رنگ خطا را از توکن `destructive` می‌گیرد.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground",
          "transition-colors duration-fast ease-emmett-standard placeholder:text-muted-foreground",
          "focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
