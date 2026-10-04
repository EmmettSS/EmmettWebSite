"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * حالت روشن/تاریک (قانون ۷ بریف فاز ۳): استراتژی کلاس (`.dark` روی `<html>`)،
 * پیش‌فرض `system` (احترام به `prefers-color-scheme`)، و next-themes به‌طور
 * خودکار انتخاب کاربر را در `localStorage` ذخیره می‌کند.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
}
