import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { useCopyToClipboard } from "../hooks";
import type { ShareState } from "../hooks";

/**
 * Share/copy bar. Sharing is a server feature (permanent noindex link); when the API is
 * unreachable the tool keeps working and the message explains the degraded state honestly.
 */
export function ShareBar({ state, onCreate, summaryText, canShare = true, note }: { state: ShareState; onCreate?: () => void; summaryText: string; canShare?: boolean; note?: string }) {
  const { lang, rtl } = useI18n();
  const copy = toolsCopy[lang];
  const { copied, copy: copyText } = useCopyToClipboard();

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {canShare ? (
          <button type="button" onClick={() => onCreate?.()} disabled={state.status === "loading"} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--bright)]/60 hover:text-white disabled:opacity-60">
            {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copy.tool.share}
          </button>
        ) : null}
        <button type="button" onClick={() => void copyText(summaryText, "summary")} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--bright)]/60 hover:text-white">
          {copied === "summary" ? copy.tool.copied : copy.tool.copy}
        </button>
        {state.status === "ready" ? (
          <a href={state.path} className="inline-flex items-center gap-2 rounded-xl border border-[var(--bright)]/40 px-3 py-2 text-sm text-[var(--bright)]">
            <ExternalLink className="h-4 w-4" aria-hidden />
            {copy.tool.shareReady}
          </a>
        ) : null}
      </div>
      {state.status === "unavailable" ? (
        <p className="mt-3 text-xs leading-6 text-white/50" role="status">
          {copy.tool.shareUnavailable}
        </p>
      ) : null}
      {note ? <p className="mt-3 text-xs leading-6 text-white/40">{note}</p> : null}
      <p className="sr-only" aria-live="polite">
        {state.status === "ready" ? `${copy.tool.shareReady}${rtl ? "" : ""}` : ""}
      </p>
    </div>
  );
}
