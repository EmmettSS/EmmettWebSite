import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * کارت — طبق اسپک طراحی فقط برای مواردی استفاده شود که محتوا واقعاً به یک
 * ظرف محصور نیاز دارد (مثل گرید دوره‌ها)، نه به‌عنوان رَپر پیش‌فرض محتوا؛
 * الگوی اصلی محتوای ادیتوریال «Editorial Row» است (در فاز بعد ساخته می‌شود).
 * Hover: مقیاس 1.02 تصویر + shadow/md (طبق اسپک «Card family»).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn(
        "group rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow duration-base ease-emmett-standard hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardMedia({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "overflow-hidden rounded-t-lg [&>img]:transition-transform [&>img]:duration-base [&>img]:ease-emmett-standard group-hover:[&>img]:scale-[1.02]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-medium leading-6", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 px-6 pb-6 pt-0", className)}
      {...props}
    />
  );
}
