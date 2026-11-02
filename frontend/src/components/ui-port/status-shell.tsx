"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { UiMotion } from "./ui-motion";

/** پوستهٔ ۴۰۴/۵۰۰ — این فایل‌ها بیرون از layout گروه `(ui)` رندر می‌شوند. */
export function StatusShell({ children }: { children: ReactNode }) {
  const t = useTranslations("common");

  return (
    <UiMotion>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <div className="ui-shell min-h-screen overflow-x-hidden bg-background text-foreground">
        <Navbar />
        <main
          id="main-content"
          className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 pt-28 pb-20 text-center"
        >
          {children}
        </main>
        <Footer />
      </div>
    </UiMotion>
  );
}
