import { useState } from "react";
import { Bot, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { Assistant } from "./Assistant";

/**
 * Floating entry point (F-08). The widget is deliberately a *link-first* surface: it never
 * steals focus, never opens itself, and on the assistant page itself it stays out of the way.
 */
export function AssistantWidget() {
  const { lang } = useI18n();
  const copy = toolsCopy[lang].assistant;
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  if (pathname.includes("/assistant")) return null;

  return (
    <>
      {open ? (
        <div className="fixed bottom-20 end-4 z-[75] w-[min(420px,92vw)] rounded-3xl border border-[var(--line)] bg-[#06140e]/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-[var(--bright)]" aria-hidden />
              {copy.widgetTitle}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[var(--line)] p-1 text-white/60 hover:text-white" aria-label={copy.close}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <Assistant compact />
          <p className="mt-2 text-[11px] text-white/55">
            <Link to={`/${lang}/assistant`} className="text-[var(--bright)] hover:underline">
              {copy.openChat}
            </Link>
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="fixed bottom-16 end-4 z-[70] inline-flex items-center gap-2 rounded-2xl border border-[var(--bright)]/40 bg-[#06140e]/90 px-3 py-2 text-xs text-[var(--bright)] backdrop-blur hover:border-[var(--bright)]"
      >
        <Bot className="h-4 w-4" aria-hidden />
        {copy.openChat}
      </button>
    </>
  );
}

export default AssistantWidget;
