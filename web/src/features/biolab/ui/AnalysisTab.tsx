/** F-09 tab 1 — sequence analysis: the core of the feature (card §UI 1). */
import { useRef, useState } from "react";
import { Link } from "react-router";
import { CODON_TABLES, MAX_SEQUENCE_LENGTH, STAGE_LABEL, type AnalysisResult, type AnalysisStage, type SanitizeResult, type CodonTableId } from "../logic";
import { biolabCopy } from "../copy";
import { useTier } from "@/lib/device-tier";
import { useCopyToClipboard, useShareLink } from "@/features/toolbox/hooks";
import { CodonTable, Disclosure, Labeled, OrfTable, RegionsTable, Stat, TextArea, Toggle } from "./bits";
import { SequenceTable } from "./SequenceTable";
import { SequenceViewer } from "./SequenceViewer";

export type AnalysisOptionsState = {
  minOrfAa: number;
  table: CodonTableId;
  bothStrands: boolean;
  gcThreshold: number;
};

export type AnalysisState =
  | { status: "idle" }
  | { status: "running"; stage: AnalysisStage | null; index: number; total: number }
  | { status: "ready"; result: AnalysisResult; mode: "worker" | "chunked" }
  | { status: "blocked"; error: SanitizeResult["error"] }
  | { status: "error"; message: string };

const CLIENT_FILE_LIMIT = 1_048_576; // 1 MB, matching the documented client ceiling

export function AnalysisTab({
  lang,
  raw,
  onRawChange,
  sanitized,
  analysis,
  options,
  onOptionsChange,
  onAnalyze,
}: {
  lang: "fa" | "en";
  raw: string;
  onRawChange: (value: string) => void;
  sanitized: SanitizeResult;
  analysis: AnalysisState;
  options: AnalysisOptionsState;
  onOptionsChange: (next: AnalysisOptionsState) => void;
  onAnalyze: (sequence?: string) => void;
}) {
  const copy = biolabCopy[lang];
  const { tier } = useTier();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { copied, copy: copyText } = useCopyToClipboard();
  const { state: shareState, create: createShare } = useShareLink("biolab");

  const result = analysis.status === "ready" ? analysis.result : null;
  const running = analysis.status === "running";

  const loadFile = async (file: File) => {
    setFileError(null);
    const name = file.name.toLowerCase();
    if (!/\.(fasta|fa|txt)$/.test(name)) {
      setFileError(copy.input.fileBadType);
      return;
    }
    if (file.size > CLIENT_FILE_LIMIT) {
      setFileError(copy.input.fileTooBig);
      return;
    }
    try {
      const text = await file.text();
      onRawChange(text);
      onAnalyze(text);
    } catch {
      setFileError(copy.input.fileReadError);
    }
  };

  const download = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const analysisJson = () => {
    if (!result) return "";
    return JSON.stringify(
      {
        tool: "emmett-biolab",
        version: "1.0.0",
        generated_at: new Date().toISOString(),
        note: "Computed locally in the browser. Sequence data is never uploaded or logged.",
        length: result.length,
        composition: result.composition,
        molecularWeightDa: Math.round(result.molecularWeightDa),
        meltingTemperature: result.tm,
        options: result.options,
        orfs: result.orfs,
        gcRegions: result.gcRegions,
        codonUsage: result.codonUsage,
      },
      null,
      2,
    );
  };

  const analysisCsv = () => {
    if (!result) return "";
    const rows: (string | number)[][] = [["section", "field", "value"]];
    rows.push(["summary", "length", result.length]);
    rows.push(["summary", "gc_percent", result.composition.gcPercent.toFixed(2)]);
    rows.push(["summary", "molecular_weight_da", Math.round(result.molecularWeightDa)]);
    rows.push(["summary", "tm_method", result.tm.method]);
    rows.push(["summary", "tm_estimate_c", (result.tm.method === "wallace" ? result.tm.wallace : result.tm.gcFormula).toFixed(1)]);
    for (const [base, count] of Object.entries(result.composition.counts)) rows.push(["composition", base, count]);
    for (const orf of result.orfs) {
      rows.push(["orf", `${orf.strand}:${orf.frame}:${orf.start}-${orf.end}`, `${orf.lengthAa} aa`]);
    }
    for (const row of result.codonUsage) rows.push(["codon", row.codon, `${row.count} (${row.perThousand.toFixed(2)}/1000)`]);
    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const createShareLink = () => {
    if (!result) return;
    void createShare(
      {
        summaryFa: `تحلیل توالی: طول ${result.length.toLocaleString("en-US")} نوکلئوتید، GC ${result.composition.gcPercent.toFixed(1)}٪`,
        summaryEn: `Sequence analysis: ${result.length.toLocaleString("en-US")} nt, GC ${result.composition.gcPercent.toFixed(1)}%`,
        params: {
          length: String(result.length),
          gc: result.composition.gcPercent.toFixed(2),
          orfs: String(result.orfs.length),
          longest_aa: String(result.longestOrf?.lengthAa ?? 0),
        },
      },
      lang,
    );
  };

  return (
    <div className="space-y-6">
      <section aria-label={copy.input.label} className="space-y-3">
        <Labeled label={copy.input.label}>
          <TextArea value={raw} onChange={onRawChange} rows={7} ariaLabel={copy.input.label} />
        </Labeled>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRawChange(SAMPLE_FASTA);
              onAnalyze(SAMPLE_FASTA);
            }}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-white/80 hover:text-white"
          >
            {copy.input.loadSample}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-white/80 hover:text-white">
            {copy.input.openFile}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".fasta,.fa,.txt,text/plain"
            className="hidden"
            data-testid="biolab-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              onRawChange("");
              setFileError(null);
            }}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-white/60 hover:text-white"
          >
            {copy.input.clear}
          </button>
          <button
            type="button"
            onClick={() => onAnalyze()}
            disabled={running}
            className="rounded-xl bg-[var(--bright)] px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
          >
            {running ? copy.input.analyzing : copy.input.analyze}
          </button>
          <span className="font-mono text-[11px] text-white/45">{copy.input.fileHint}</span>
        </div>
        <p className="text-xs text-white/45">{copy.input.sampleNote}</p>
        {fileError ? (
          <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {fileError}
          </p>
        ) : null}
        {sanitized.error ? (
          <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {sanitized.error[lang]}
          </p>
        ) : sanitized.length ? (
          <p className="font-mono text-[11px] text-white/50">
            {sanitized.length.toLocaleString("en-US")} {copy.input.chars}
            {sanitized.header ? ` · ${copy.input.header}: ${sanitized.header.slice(0, 60)}` : ""}
          </p>
        ) : null}
        <Disclosure title={copy.input.options}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label={copy.input.minOrf}>
              <input
                type="number"
                min={3}
                max={1000}
                value={options.minOrfAa}
                onChange={(event) => onOptionsChange({ ...options, minOrfAa: Math.max(3, Number(event.target.value) || 3) })}
                className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85"
              />
            </Labeled>
            <Labeled label={copy.input.table}>
              <select
                value={options.table}
                onChange={(event) => onOptionsChange({ ...options, table: event.target.value as CodonTableId })}
                className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85"
              >
                {Object.entries(CODON_TABLES).map(([id, table]) => (
                  <option key={id} value={id}>
                    {table.label[lang]}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label={copy.input.gcThreshold}>
              <input
                type="number"
                min={30}
                max={90}
                value={options.gcThreshold}
                onChange={(event) => onOptionsChange({ ...options, gcThreshold: Math.min(90, Math.max(30, Number(event.target.value) || 60)) })}
                className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-white/85"
              />
            </Labeled>
            <div className="flex items-end">
              <Toggle label={copy.input.bothStrands} checked={options.bothStrands} onChange={(next) => onOptionsChange({ ...options, bothStrands: next })} />
            </div>
          </div>
        </Disclosure>
      </section>

      {running ? (
        <div aria-live="polite" className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
          <p className="text-xs text-white/60">
            {analysis.stage ? STAGE_LABEL[analysis.stage][lang] : copy.input.analyzing} · {analysis.index}/{analysis.total}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[var(--bright)] transition-[width] duration-200" style={{ width: `${analysis.total ? (analysis.index / analysis.total) * 100 : 8}%` }} />
          </div>
        </div>
      ) : null}

      {analysis.status === "error" ? (
        <p role="alert" className="rounded-2xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {analysis.message}
        </p>
      ) : null}

      {!result ? (
        <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-sm text-white/55">{copy.results.empty}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={copy.results.length} value={`${result.length.toLocaleString("en-US")} ${lang === "fa" ? "nt" : "nt"}`} hint={copy.input.header === "سرخط" ? sanitized.header ?? undefined : undefined} />
            <Stat label={copy.results.gc} value={`${result.composition.gcPercent.toFixed(2)}%`} hint={`AT ${result.composition.atPercent.toFixed(2)}% · ${copy.results.skew} ${result.composition.gcSkew.toFixed(3)}`} />
            <Stat
              label={copy.results.mw}
              value={`${Math.round(result.molecularWeightDa).toLocaleString("en-US")} Da`}
              hint={lang === "fa" ? "تک‌رشته" : "single strand"}
            />
            <Stat
              label={copy.results.tm}
              value={`${(result.tm.method === "wallace" ? result.tm.wallace : result.tm.gcFormula).toFixed(1)} °C`}
              hint={result.tm.method === "wallace" ? copy.results.tmWallace : copy.results.tmGc}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/45">
            <span>
              {copy.results.counts}: A {result.composition.counts.A.toLocaleString("en-US")} · C {result.composition.counts.C.toLocaleString("en-US")} · G{" "}
              {result.composition.counts.G.toLocaleString("en-US")} · T {result.composition.counts.T.toLocaleString("en-US")}
              {result.composition.ambiguous ? ` · N ${result.composition.ambiguous}` : ""}
            </span>
            <span>
              {copy.results.time}: {result.computeMs.toFixed(0)} ms
            </span>
            <span data-testid="biolab-mode">{analysis.status === "ready" && analysis.mode === "worker" ? copy.input.worker : copy.input.workerOff}</span>
          </div>

          <section aria-label={copy.results.viewer} className="space-y-3">
            <h3 className="text-sm font-semibold text-white/85">{copy.results.viewer}</h3>
            {tier === "low-power" ? (
              <div className="space-y-3" data-testid="biolab-table-mode">
                <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs text-white/60">{copy.results.tableMode}</p>
                <SequenceTable sequenceLength={result.length} track={result.gcTrack} orfs={result.orfs} regions={result.gcRegions} lang={lang} />
              </div>
            ) : (
              <SequenceViewer
                sequenceLength={result.length}
                track={result.gcTrack}
                orfs={result.orfs}
                regions={result.gcRegions}
                tier={tier}
                lang={lang}
              />
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold text-white/70">{copy.results.regionsTitle}</h4>
                <RegionsTable regions={result.gcRegions} lang={lang} />
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-white/70">{copy.results.codonTitle}</h4>
                <CodonTable rows={result.codonUsage} lang={lang} />
              </div>
            </div>
          </section>

          <section aria-label={copy.results.orfTitle} className="space-y-3">
            <h3 className="text-sm font-semibold text-white/85">{copy.results.orfTitle}</h3>
            <OrfTable orfs={result.orfs} lang={lang} />
          </section>

          <section className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
            <span className="text-xs text-white/55">{copy.results.download}:</span>
            <button type="button" onClick={() => download("emmett-biolab-analysis.json", analysisJson(), "application/json")} className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs text-white/80 hover:text-white">
              {copy.results.downloadJson}
            </button>
            <button type="button" onClick={() => download("emmett-biolab-analysis.csv", analysisCsv(), "text/csv")} className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs text-white/80 hover:text-white">
              {copy.results.downloadCsv}
            </button>
            <button type="button" onClick={createShareLink} disabled={shareState.status === "loading"} className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs text-white/80 hover:text-white disabled:opacity-60">
              {copy.results.share}
            </button>
            {shareState.status === "ready" && shareState.path ? (
              <span className="inline-flex items-center gap-2 text-xs text-[var(--bright)]">
                <Link to={shareState.path} className="underline">
                  {copy.results.shareReady}
                </Link>
                <button type="button" onClick={() => void copyText(shareState.path ?? "", "share")} className="rounded-lg border border-[var(--line)] px-2 py-1 text-[11px] text-white/70">
                  {copied === "share" ? copy.convert.copied : copy.results.shareCopy}
                </button>
              </span>
            ) : null}
            {shareState.status === "unavailable" ? (
              <span className="text-xs text-amber-200">{copy.results.shareUnavailable}</span>
            ) : null}
            <span className="basis-full text-[11px] text-white/40">{copy.results.sharePrivacy}</span>
          </section>
        </>
      )}

      <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs leading-6 text-white/60">{copy.notices.disclaimer}</p>
    </div>
  );
}

/** The reference sample is imported here so the button and the sync path stay in one place. */
import { REFERENCE_SAMPLE } from "../data/reference";

const SAMPLE_FASTA = REFERENCE_SAMPLE.fasta;
export const CLIENT_SEQUENCE_LIMIT = MAX_SEQUENCE_LENGTH;
