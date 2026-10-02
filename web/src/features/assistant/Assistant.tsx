import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ChevronUp, Loader2, Send, Sparkles, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { apiGet, apiPost, ApiError, pollJob } from "@/lib/api-client";
import { emit } from "@/lib/events";
import {
  citationHref,
  citationLabel,
  displayAnswer,
  hasVisibleAnswer,
  isWithinLimit,
  MAX_QUESTION_CHARS,
  mergeProgress,
  modeLabel,
  workItems,
  type AnswerPayload,
  type ProgressStep,
} from "./logic";

type Suggestion = { id: string; question: string; url: string };

type Turn = { question: string; payload: AnswerPayload | null; failed?: string };

export function Assistant({ compact = false }: { compact?: boolean }) {
  const { lang, rtl } = useI18n();
  const copy = toolsCopy[lang].assistant;
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openWork, setOpenWork] = useState<number | null>(null);
  const [voted, setVoted] = useState<Record<number, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<{ suggestions: Suggestion[] }>(`/assistant/suggestions/?lang=${lang}`)
      .then((payload) => {
        if (active) setSuggestions(payload.suggestions ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [lang]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, busy]);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!isWithinLimit(trimmed) || busy) return;
      setBusy(true);
      setSteps([]);
      setTurns((current) => [...current, { question: trimmed, payload: null }]);
      setQuestion("");
      try {
        const accepted = await apiPost<{ job_id: number }>("/assistant/ask/", { question: trimmed, locale: lang });
        const { result } = await pollJob<AnswerPayload, ProgressStep>(`/assistant/ask/${accepted.job_id}/poll/`, {
          intervalMs: 700,
          maxMs: 45_000,
          onProgress: (incoming) => setSteps((current) => mergeProgress(current, incoming)),
        });
        emit("assistant_ask", { had_citation: (result?.citations.length ?? 0) > 0 });
        if (!result || result.citations.length === 0) emit("assistant_fallback", { reason: "low_similarity" });
        setTurns((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, payload: result };
          return next;
        });
      } catch (error) {
        emit("assistant_fallback", { reason: error instanceof ApiError && error.status === 503 ? "provider_down" : "offline" });
        const message = error instanceof ApiError ? (lang === "fa" ? error.messageFa : error.messageEn) : copy.errorGeneric;
        setTurns((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, failed: message };
          return next;
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, copy.errorGeneric, lang],
  );

  async function vote(questionIndex: number, payload: AnswerPayload, helpful: boolean) {
    if (!payload.answer_id) return;
    setVoted((current) => ({ ...current, [questionIndex]: helpful }));
    await apiPost("/assistant/feedback/", { answer_id: payload.answer_id, helpful }).catch(() => undefined);
  }

  return (
    <div className={compact ? "flex h-full flex-col" : "flex flex-col"}>
      <div
        ref={listRef}
        className={`space-y-4 overflow-y-auto px-1 ${compact ? "max-h-[52vh] flex-1" : "max-h-[60vh]"}`}
        aria-live="polite"
      >
        {turns.length === 0 ? <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs leading-6 text-white/50">{copy.intro}</p> : null}
        {turns.map((turn, index) => (
          <article key={`${index}-${turn.question}`} className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-white/80">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-white/55" aria-hidden />
              <p>{turn.question}</p>
            </div>
            {turn.failed ? (
              <p className="rounded-2xl border border-[#e26a5a]/40 bg-[#e26a5a]/10 p-3 text-xs text-white/75" role="alert">
                {turn.failed}
              </p>
            ) : !turn.payload ? (
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {copy.thinking}
                {steps.length > 0 ? <span className="font-mono text-[11px] text-white/55">{steps.map((step) => step.step).join(" → ")}</span> : null}
              </p>
            ) : (
              <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--bright)]">
                    <Bot className="h-3 w-3" aria-hidden />
                    {modeLabel(turn.payload.mode, lang)}
                  </span>
                  {turn.payload.cached ? <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-white/55">{copy.cached}</span> : null}
                  <span className="font-mono text-white/55">{turn.payload.latency_ms}ms</span>
                </div>

                {hasVisibleAnswer(turn.payload) ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/85">{displayAnswer(turn.payload)}</p>
                ) : (
                  <p className="mt-3 text-sm text-white/60">{copy.noCitations}</p>
                )}

                {turn.payload.citations.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] text-white/55">{copy.citations}</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {turn.payload.citations.map((citation) => {
                        const href = citationHref(citation, lang);
                        return (
                          <li key={`${citation.chunk_id}-${citation.source}`}>
                            {href ? (
                              <a href={href} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-white/70 hover:text-white">
                                {citationLabel(citation)}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-[11px] text-white/55">
                                {citationLabel(citation)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-white/55">{turn.payload.disclosure || copy.disclosure}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOpenWork(openWork === index ? null : index)}
                    aria-expanded={openWork === index}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-white/60 hover:text-white"
                  >
                    {openWork === index ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                    {openWork === index ? copy.hideWork : copy.showWork}
                  </button>
                  {turn.payload.answer_id ? (
                    voted[index] === undefined ? (
                      <>
                        <span className="text-white/55">{copy.feedback}</span>
                        <button type="button" onClick={() => void vote(index, turn.payload!, true)} className="rounded-lg border border-[var(--line)] px-2 py-1 hover:text-white">
                          <ThumbsUp className="h-3 w-3" aria-hidden />
                          <span className="sr-only">{copy.helpful}</span>
                        </button>
                        <button type="button" onClick={() => void vote(index, turn.payload!, false)} className="rounded-lg border border-[var(--line)] px-2 py-1 hover:text-white">
                          <ThumbsDown className="h-3 w-3" aria-hidden />
                          <span className="sr-only">{copy.notHelpful}</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-white/55">{copy.thanks}</span>
                    )
                  ) : null}
                </div>

                {openWork === index ? (
                  <ul className="mt-2 space-y-2 text-[11px] text-white/55">
                    {workItems(turn.payload).map((item) => (
                      <li key={`work-${item.chunk_id}`} className="rounded-xl border border-[var(--line)] bg-black/20 p-2">
                        <b className="text-white/75">{item.title || item.source}</b>
                        <span className="ms-1 font-mono text-white/55">score {item.score}</span>
                        <p className="mt-1 leading-5">{item.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </article>
        ))}
      </div>

      {turns.length === 0 && suggestions.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] text-white/55">{copy.suggestions}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => void ask(suggestion.question)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-white/70 hover:border-[var(--bright)]/50 hover:text-white"
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {suggestion.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="mt-4 flex items-end gap-2"
      >
        <label className="flex-1">
          <span className="sr-only">{copy.placeholder}</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_CHARS + 40))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask(question);
              }
            }}
            rows={compact ? 2 : 2}
            placeholder={copy.placeholder}
            aria-invalid={question.length > MAX_QUESTION_CHARS}
            className="w-full resize-none rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--bright)]/60"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !isWithinLimit(question)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--bright)]/50 px-3 py-2 text-sm text-[var(--bright)] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {copy.ask}
        </button>
      </form>
      <p className="mt-2 text-[11px] leading-5 text-white/55">
        {copy.limitNote}
        {question.length > MAX_QUESTION_CHARS ? <span className="text-[#e26a5a]"> · {question.length}/{MAX_QUESTION_CHARS}</span> : null}
        {rtl ? "" : ""}
      </p>
    </div>
  );
}
