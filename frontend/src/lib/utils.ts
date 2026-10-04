import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * ترکیب شرطی کلاس‌های Tailwind با حل تداخل‌ها (مثل shadcn/ui).
 * استفاده در تمام کامپوننت‌های atoms/molecules/organisms الزامی است تا
 * className بیرونی همیشه بتواند توکن‌های داخلی را override کند.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
