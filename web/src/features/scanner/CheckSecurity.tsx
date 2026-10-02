import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { apiGet, apiPost, ApiError, PollTimeoutError, pollJob } from "@/lib/api-client";
import { trackGoal } from "@/lib/analytics";
import { useCopyToClipboard } from "@/features/toolbox/hooks";
import {
  gradeTone,
  isValidDomain,
  mergeSteps,
  normalizeDomainInput,
  overallSummary,
  recommendations,
  statusLabel,
  type ScanResult,
  type ScanStep,
} from "./logic";

type Phase =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "running"; steps: ScanStep[]; jobId: number }
  | { kind: "done"; result: ScanResult; steps: ScanStep[] }
  | { kind: "queued"; jobId: number; steps: ScanStep[] }
  | { kind: "error"; message: string };

const GRADE_TOKENS = {
  good: "var(--color-capability-backend)",
  mid: "#d9a441",
  bad: "#e26a5a",
} as const;

export function CheckSecurity() {
  const { lang, rtl } = useI18n();
  const copy = toolsCopy[lang].scanner;
  const [params, setParams] = useSearchParams();
  const deepLinkId = params.get("id");
  const [domain, setDomain] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [result, setResult] = useState<ScanResult | null>(null);
  const { copied, copy: copyText } = useCopyToClipboard();
  const abort = useRef<AbortController | null>(null);

  const loadReport = useCallback(
    async (resultId: string) => {
      try {
        const report = await apiGet<ScanResult>(`/scanner/results/${encodeURIComponent(resultId)}/`);
        setResult(report);
        setPhase({ kind: "done", result: report, steps: [] });
      } catch {
        setPhase({ kind: "error", message: copy.invalidDomain });
      }
    },
    [copy.invalidDomain],
  );

  useEffect(() => {
    if (deepLinkId) void loadReport(deepLinkId);
    return () => abort.current?.abort();
  }, [deepLinkId, loadReport]);

  const summary = useMemo(() => (result ? overallSummary(result.sections) : null), [result]);
  const advice = useMemo(() => (result ? recommendations(result.sections) : []), [result]);
  const canSubmit = consent && isValidDomain(domain) && phase.kind !== "submitting" && phase.kind !== "running";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeDomainInput(domain);
    if (!isValidDomain(normalized) || !consent) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setResult(null);
    setPhase({ kind: "submitting" });
    try {
      const created = await apiPost<{ job_id: number }>("/scanner/jobs/", {
        domain: normalized,
        consent: true,
        locale: lang,
      });
      setPhase({ kind: "running", steps: [], jobId: created.job_id });
      try {
        const { result: payload } = await pollJob<{ result_id: string }, ScanStep>(
          `/scanner/jobs/${created.job_id}/poll/`,
          {
            intervalMs: 1500,
            maxMs: 75_000,
            signal: controller.signal,
            onProgress: (steps) => {
              setPhase((current) =>
                current.kind === "running" ? { ...current, steps: mergeSteps(current.steps, steps) } : current,
              );
            },
          },
        );
        if (payload?.result_id) {
          const report = await apiGet<ScanResult>(`/scanner/results/${payload.result_id}/`);
          setResult(report);
          setPhase({ kind: "done", result: report, steps: [] });
          setParams({ id: payload.result_id }, { replace: true });
        }
      } catch (error) {
        if (error instanceof PollTimeoutError) {
          setPhase((current) => ({ kind: "queued", jobId: created.job_id, steps: current.kind === "running" ? current.steps : [] }));
        } else {
          throw error;
        }
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 429
            ? copy.rateLimited
            : lang === "fa"
              ? error.messageFa
              : error.messageEn
          : copy.degradedBody;
      setPhase({ kind: "error", message });
    }
  }

  const tone = result ? GRADE_TOKENS[gradeTone(result.grade)] : GRADE_TOKENS.mid;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#d9a441]/40 bg-[#d9a441]/10 p-4 text-xs leading-6 text-white/75" role="note">
        <b className="mb-1 flex items-center gap-2 text-white/85">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          {copy.eyebrow}
        </b>
        {copy.disclaimer}
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-white/50">{copy.domain}</span>
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder={copy.domainPlaceholder}
              dir="ltr"
              inputMode="url"
              autoComplete="off"
              aria-invalid={domain.length > 0 && !isValidDomain(domain)}
              className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-[var(--bright)]/60"
            />
          </label>
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--bright)]/50 px-4 py-2.5 text-sm text-[var(--bright)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase.kind === "submitting" || phase.kind === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden />
            )}
            {phase.kind === "running" ? copy.running : copy.submit}
          </button>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--bright)]"
          />
          <span>
            {copy.consent}
            <span className="mt-1 block text-xs text-white/45">{copy.consentNote}</span>
          </span>
        </label>

        {domain.length > 0 && !isValidDomain(domain) ? <p className="text-xs text-[#e26a5a]">{copy.invalidDomain}</p> : null}
      </form>

      {(phase.kind === "running" || phase.kind === "queued") && (
        <ol className="space-y-2 text-sm" aria-live="polite">
          {phase.steps.length === 0 ? <li className="text-white/50">{copy.queued}</li> : null}
          {phase.steps
            .filter((step) => step.state !== "running")
            .map((step) => (
              <li key={`${step.step}-${step.state}`} className="flex items-center gap-2 text-white/70">
                {step.state === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--bright)]" aria-hidden />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-[#e26a5a]" aria-hidden />
                )}
                {lang === "fa" ? step.label_fa : step.label_en}
                {step.state === "failed" ? <span className="text-xs text-white/40">— {copy.failedBody}</span> : null}
              </li>
            ))}
          {phase.kind === "queued" ? (
            <li className="rounded-xl border border-[var(--line)] p-3 text-xs text-white/60">
              <b className="block text-white/80">{copy.degradedTitle}</b>
              {copy.degradedBody}
            </li>
          ) : (
            <li className="text-xs text-white/40">{copy.queueNote}</li>
          )}
        </ol>
      )}

      {phase.kind === "error" ? (
        <p className="rounded-2xl border border-[#e26a5a]/40 bg-[#e26a5a]/10 p-4 text-sm text-white/80" role="alert">
          {phase.message}
        </p>
      ) : null}

      {result ? (
        <section className="space-y-5" aria-labelledby="report-title">
          <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <div
              className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-semibold"
              style={{ border: `1px solid ${tone}`, color: tone }}
              aria-label={`${copy.grade} ${result.grade}`}
            >
              {result.grade}
            </div>
            <div className="min-w-0">
              <h2 id="report-title" className="text-lg font-semibold">
                {copy.resultTitle} — <span dir="ltr">{result.domain}</span>
              </h2>
              <p className="text-xs text-white/50">
                {copy.score}: {result.score}/100 · {summary?.pass ?? 0} {statusLabel("pass", lang)} · {summary?.fail ?? 0}{" "}
                {statusLabel("fail", lang)}
              </p>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyText(window.location.href, "report")}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs hover:text-white"
              >
                {copied === "report" ? toolsCopy[lang].tool.copied : copy.reportLink}
              </button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {result.sections.map((section) => (
              <article key={section.id} className="rounded-2xl border border-[var(--line)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{lang === "fa" ? section.label_fa : section.label_en}</h3>
                  <span className="font-mono text-xs text-white/50">{section.checked ? `${section.score}/100` : "—"}</span>
                </div>
                {!section.checked ? (
                  <p className="mt-2 text-xs text-white/45">
                    <b className="block text-white/70">{copy.failedTitle}</b>
                    {lang === "fa" ? section.reason_fa : section.reason_en || copy.failedBody}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-xs leading-6 text-white/70">
                    {section.findings.map((finding) => (
                      <li key={finding.key} className="rounded-xl border border-[var(--line)] bg-black/20 p-2.5">
                        <b className="text-white/80">{lang === "fa" ? finding.label_fa : finding.label_en}</b>{" "}
                        <span className="text-white/45">· {statusLabel(finding.status, lang)}</span>
                        <p className="mt-1">{lang === "fa" ? finding.detail_fa : finding.detail_en}</p>
                        {finding.advice_fa || finding.advice_en ? (
                          <p className="mt-1 text-white/50">{lang === "fa" ? finding.advice_fa : finding.advice_en}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          {advice.length > 0 ? (
            <section className="rounded-2xl border border-[var(--line)] p-4">
              <h3 className="text-sm font-semibold">{copy.recommendations}</h3>
              <ul className="mt-3 space-y-3 text-xs leading-6 text-white/70">
                {advice.map((finding) => (
                  <li key={`advice-${finding.key}`}>
                    <b className="block text-white/80">{lang === "fa" ? finding.advice_fa : finding.advice_en}</b>
                    {finding.snippet ? (
                      <pre dir="ltr" className="mt-1 overflow-auto rounded-xl border border-[var(--line)] bg-black/40 p-3 text-[11.5px] text-white/70">
                        <code>{finding.snippet}</code>
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[var(--bright)]/40 bg-[var(--bright)]/5 p-5">
            <h3 className="text-sm font-semibold">{copy.ctaTitle}</h3>
            <p className="mt-2 text-xs leading-6 text-white/60">{copy.ctaBody}</p>
            <Link
              to={`/${lang}/products/pentestor`}
              onClick={() => trackGoal("scan_report_cta", result.domain)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--bright)]/60 px-4 py-2 text-sm text-[var(--bright)]"
            >
              {copy.ctaButton}
              {rtl ? <ArrowLeft className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
            </Link>
          </section>

          <p className="text-xs leading-6 text-white/45">
            {copy.noindexNote} · {copy.evidenceNote}
          </p>
        </section>
      ) : null}
    </div>
  );
}
