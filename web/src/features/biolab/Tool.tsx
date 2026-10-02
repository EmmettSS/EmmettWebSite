/**
 * F-09 — the bioinformatics workbench (four tabs, 100% client-side computation).
 * The page shell (title, JSON-LD, related tools) comes from `index.tsx`.
 */
import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n";
import { trackGoal } from "@/lib/analytics";
import { emit, lengthBucket } from "@/lib/events";
import { trackToolUse } from "@/features/toolbox/hooks";
import { biolabCopy } from "./copy";
import { sanitizeInput } from "./logic";
import { runAnalysis } from "./runner";
import { AnalysisTab, type AnalysisOptionsState, type AnalysisState } from "./ui/AnalysisTab";
import { ConvertTab } from "./ui/ConvertTab";
import { FhirTab } from "./ui/FhirTab";
import { PipelineTab } from "./ui/PipelineTab";
import { REFERENCE_SAMPLE } from "./data/reference";

/** The preloaded sample: a public reference sequence, never a private dataset. */
const SAMPLE = REFERENCE_SAMPLE.fasta;

type TabKey = "analysis" | "convert" | "pipeline" | "fhir";
const TAB_ORDER: TabKey[] = ["analysis", "convert", "pipeline", "fhir"];

export function Tool() {
  const { lang } = useI18n();
  const copy = biolabCopy[lang];
  const [tab, setTab] = useState<TabKey>("analysis");
  const [raw, setRaw] = useState("");
  const [options, setOptions] = useState<AnalysisOptionsState>({ minOrfAa: 30, table: "standard", bothStrands: true, gcThreshold: 60 });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });

  const sanitized = useMemo(() => sanitizeInput(raw), [raw]);
  const result = analysis.status === "ready" ? analysis.result : null;

  const run = useCallback(
    async (input?: string) => {
      const source = input ?? raw;
      const clean = sanitizeInput(source);
      if (clean.error) {
        setAnalysis({ status: "blocked", error: clean.error });
        return;
      }
      setAnalysis({ status: "running", stage: null, index: 0, total: 5 });
      try {
        const { result: analysed, mode } = await runAnalysis(clean.sequence, {
          minOrfAa: options.minOrfAa,
          table: options.table,
          bothStrands: options.bothStrands,
          gcRichThreshold: options.gcThreshold,
          onProgress: (progress) =>
            setAnalysis({
              status: "running",
              stage: progress.stage === "done" ? null : progress.stage,
              index: progress.index,
              total: progress.total,
            }),
        });
        setAnalysis({ status: "ready", result: analysed, mode });
        trackToolUse("biolab", lang, true);
        trackGoal("biolab_analyze", mode);
        emit("bio_analyze", { length_bucket: lengthBucket(clean.sequence.length) });
      } catch (error) {
        setAnalysis({ status: "error", message: error instanceof Error ? error.message : String(error) });
        trackGoal("biolab_analyze_error");
      }
    },
    [lang, options, raw],
  );

  const analyzeSample = useCallback(() => {
    setTab("analysis");
    void run(SAMPLE);
  }, [run]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TAB_ORDER.indexOf(tab);
    if (event.key === "ArrowRight") setTab(TAB_ORDER[(index + 1) % TAB_ORDER.length]);
    else if (event.key === "ArrowLeft") setTab(TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length]);
    else return;
    event.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={lang === "fa" ? "بخش‌های میز کار" : "Workbench sections"} onKeyDown={onKeyDown} className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            role="tab"
            id={`biolab-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`biolab-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${tab === key ? "bg-[var(--bright)] font-semibold text-black" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
          >
            {copy.tabs[key]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`biolab-panel-${tab}`} aria-labelledby={`biolab-tab-${tab}`}>
        {tab === "analysis" ? (
          <AnalysisTab
            lang={lang}
            raw={raw}
            onRawChange={setRaw}
            sanitized={sanitized}
            analysis={analysis}
            options={options}
            onOptionsChange={setOptions}
            onAnalyze={(value) => void run(value)}
          />
        ) : null}
        {tab === "convert" ? <ConvertTab lang={lang} sequence={sanitized.sequence} /> : null}
        {tab === "pipeline" ? <PipelineTab lang={lang} /> : null}
        {tab === "fhir" ? <FhirTab lang={lang} result={result} onAnalyzeSample={analyzeSample} /> : null}
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs leading-6 text-white/60">
        <p>🔒 {copy.notices.noPatientData}</p>
        <p>📴 {copy.notices.offlineOk}</p>
      </div>
    </div>
  );
}
