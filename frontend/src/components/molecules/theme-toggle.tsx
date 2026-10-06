"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";

/**
 * دکمهٔ تغییر تم. تا زمانی که کامپوننت mount نشده (مرحلهٔ SSR/hydration)
 * چیزی رندر نمی‌کند تا از عدم‌تطابق hydration بین تم سرور/کلاینت جلوگیری شود
 * (الگوی رسمی next-themes).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();
  const t = useTranslations("theme");

  if (!mounted) {
    return <Button variant="icon" aria-hidden="true" tabIndex={-1} className="opacity-0" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="icon"
      aria-label={t("toggleLabel")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </Button>
  );
}
