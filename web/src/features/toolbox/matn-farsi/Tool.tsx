import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n";
import { useTier } from "@/lib/device-tier";
import { trackToolUse, useDebounced, useShareLink, useUrlState } from "../hooks";
import { ShareBar } from "../ui/ShareBar";
import {
  ALL_RULE_IDS,
  DEFAULT_RULES,
  RULES_VERSION,
  RULE_LABELS,
  buildDiff,
  diffPlainText,
  normalizePersian,
  type RuleId,
} from "./logic";

const SAMPLE = "مي‌شود اين كتاب را با \"دقت\" خواند؛   نمي‌دانم چرا. ٠١٢٣٤٥";

export function Tool() {
  const { lang } = useI18n();
  const { tier } = useTier();
  const [state, setState] = useUrlState(
    useMemo(
      () => (params: URLSearchParams) => {
        const rules = params.get("r")?.split(",").filter((id): id is RuleId => ALL_RULE_IDS.includes(id as RuleId));
        const raw = params.get("t");
        let text = SAMPLE;
        if (raw) {
          try {
            text = decodeURIComponent(raw);
          } catch {
            text = SAMPLE;
          }
        }
        return { text, rules: rules && rules.length ? rules : DEFAULT_RULES };
      },
      [],
    ),
    useMemo(
      () => (next: { text: string; rules: RuleId[] }) =>
        new URLSearchParams({ t: encodeURIComponent(next.text.slice(0, 400)), r: next.rules.join(",") }),
      [],
    ),
  );
  const [input, setInput] = useState(state.text);
  const debounced = useDebounced(input, tier === "low-power" ? 320 : 140);
  const result = useMemo(() => normalizePersian(debounced, state.rules), [debounced, state.rules]);
  const segments = useMemo(() => buildDiff(debounced, result.normalized), [debounced, result.normalized]);
  const [showRegex, setShowRegex] = useState(false);
  const share = useShareLink("matn-farsi");

  useEffect(() => {
    if (result.total > 0) trackToolUse("matn-farsi", lang, true);
  }, [result.total, lang]);

  const toggleRule = (rule: RuleId) => setState({ ...state, rules: state.rules.includes(rule) ? state.rules.filter((id) => id !== rule) : [...state.rules, rule] });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "متن ورودی" : "Input text"}</span>
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setState({ ...state, text: event.target.value.slice(0, 400) });
            }}
            rows={9}
            className="w-full rounded-2xl border border-[var(--line)] bg-black/30 p-4 text-sm leading-7 outline-none focus:border-[var(--bright)]/60"
            maxLength={50_000}
            aria-describedby="matn-help"
          />
        </label>
        <div>
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "diff زنده (تغییرات مشخص‌شده)" : "Live diff (changed runs marked)"}</span>
          <div className="h-[236px] overflow-auto rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-sm leading-7" aria-live="polite">
            {/* Segments render as text nodes only — user input can never become markup. */}
            {segments.map((segment, index) =>
              segment.changed ? (
                <mark key={index} className="rounded bg-[var(--bright)]/20 px-1 text-[var(--bright)]">
                  {segment.text}
                </mark>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </div>
          <p id="matn-help" className="mt-2 text-xs text-white/40">
            {lang === "fa" ? `قواعد نسخهٔ ${RULES_VERSION} · ${result.total} تغییر` : `Rules ${RULES_VERSION} · ${result.total} changes`}
          </p>
        </div>
      </div>

      <fieldset className="rounded-2xl border border-[var(--line)] p-4">
        <legend className="px-2 text-xs text-white/50">{lang === "fa" ? "قواعد" : "Rules"}</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_RULE_IDS.map((rule) => (
            <label key={rule} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${state.rules.includes(rule) ? "border-[var(--bright)]/50 text-white" : "border-[var(--line)] text-white/45"}`}>
              <input type="checkbox" checked={state.rules.includes(rule)} onChange={() => toggleRule(rule)} className="accent-[var(--emerald)]" />
              {RULE_LABELS[rule][lang]}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setShowRegex((value) => !value)} className="mt-3 text-xs text-white/50 underline decoration-dotted hover:text-white" aria-expanded={showRegex}>
          {lang === "fa" ? "نمایش regex معادل هر قاعده" : "Show the regex behind each rule"}
        </button>
        {showRegex ? (
          <ul className="mt-3 space-y-2 text-xs" dir="ltr">
            {ALL_RULE_IDS.map((rule) => (
              <li key={rule} className="flex flex-wrap items-center gap-2 font-mono text-white/55">
                <code className="rounded bg-black/40 px-2 py-1">{RULE_LABELS[rule].regex}</code>
                <span className="text-white/35">{RULE_LABELS[rule][lang === "fa" ? "en" : "fa"]}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      {result.changes.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.changes.map((change) => (
            <li key={change.rule} className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs">
              <b className="block text-white/75">{RULE_LABELS[change.rule][lang]}</b>
              <span className="mt-1 block text-white/45">
                {lang === "fa" ? `${change.count} تغییر` : `${change.count} change(s)`}
              </span>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-white/40" dir="rtl">
                {change.samples.map((sample) => (
                  <li key={sample}>{sample}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-[var(--line)] p-4 text-sm text-white/50">{lang === "fa" ? "با قواعد فعلی چیزی برای تغییر پیدا نشد." : "Nothing to change with the current rules."}</p>
      )}

      <ShareBar
        state={share.state}
        summaryText={`${diffPlainText(buildDiff(debounced, result.normalized))}`.slice(0, 400)}
        canShare={Boolean(debounced)}
        onCreate={() =>
          void share.create(
            {
              summaryFa: `نرمال‌سازی متن (${result.total} تغییر): ${result.normalized.slice(0, 120)}`,
              summaryEn: `Text normalised (${result.total} changes): ${result.normalized.slice(0, 120)}`,
              params: { tool: "matn-farsi", t: encodeURIComponent(debounced.slice(0, 400)), r: state.rules.join(",") },
            },
            lang,
          )
        }
      />
    </div>
  );
}
