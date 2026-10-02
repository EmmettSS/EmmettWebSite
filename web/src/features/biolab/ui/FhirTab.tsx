/** F-09 tab 4 — synthetic FHIR samples with a local structural validator (card §UI 4). */
import { useMemo, useState } from "react";
import type { AnalysisResult } from "../logic";
import { biolabCopy } from "../copy";
import { PATIENT_DATA_FIELDS, sampleFhir, validateFhir } from "../fhir";
import { JsonLd } from "@/lib/seo";
import { CopyButton } from "./bits";

export function FhirTab({ lang, result, onAnalyzeSample }: { lang: "fa" | "en"; result: AnalysisResult | null; onAnalyzeSample: () => void }) {
  const copy = biolabCopy[lang].fhir;
  const [openResource, setOpenResource] = useState<string | null>("Patient");
  const resources = useMemo(() => (result ? sampleFhir(result) : []), [result]);
  const report = useMemo(() => validateFhir(resources), [resources]);

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100" role="note">
        ⚠️ {copy.warning}
      </p>
      <p className="text-sm leading-6 text-white/70">{copy.intro}</p>

      {!result ? (
        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-black/20 p-4">
          <p className="text-sm text-white/60">{biolabCopy[lang].results.empty}</p>
          <button type="button" onClick={onAnalyzeSample} className="rounded-xl bg-[var(--bright)] px-4 py-2 text-xs font-semibold text-black">
            {biolabCopy[lang].input.loadSample}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-white/55">{copy.validate}:</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${report.valid ? "border-[var(--bright)]/60 text-[var(--bright)]" : "border-rose-400/60 text-rose-200"}`}
              data-testid="fhir-status"
            >
              {report.valid ? copy.valid : copy.invalid}
            </span>
            {!report.valid ? (
              <span className="font-mono text-[11px] text-rose-200">
                {copy.missing}: {report.missing.map((item) => `${item.resource}(${item.fields.join(", ")})`).join(" · ")}
              </span>
            ) : null}
          </div>

          <div className="space-y-3">
            {resources.map((resource) => {
              const key = resource.resourceType;
              const open = openResource === key;
              return (
                <section key={key} className="rounded-2xl border border-[var(--line)] bg-black/20">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <button type="button" onClick={() => setOpenResource(open ? null : key)} className="text-sm font-semibold text-white/85" aria-expanded={open}>
                      {copy.resources[key as keyof typeof copy.resources] ?? key}
                    </button>
                    <CopyButton text={JSON.stringify(resource, null, 2)} label={biolabCopy[lang].convert.copy} copiedLabel={biolabCopy[lang].convert.copied} />
                  </div>
                  {open ? (
                    <pre dir="ltr" className="max-h-80 overflow-auto border-t border-[var(--line)] p-4 text-left font-mono text-[11.5px] leading-5 text-white/70">
                      {JSON.stringify(resource, null, 2)}
                    </pre>
                  ) : null}
                </section>
              );
            })}
          </div>

          <p className="text-[11px] leading-6 text-white/45">{copy.note}</p>
          <p className="text-[11px] leading-6 text-white/45">
            {lang === "fa" ? "فیلدهای ممنوع (هرگز پذیرفته نمی‌شوند):" : "Forbidden fields (never accepted):"}{" "}
            <span dir="ltr" className="font-mono">
              {PATIENT_DATA_FIELDS.slice(0, 6).join(", ")}
            </span>
          </p>
          <JsonLd data={{ "@context": "https://schema.org", "@type": "Dataset", name: copy.resources.patient, description: copy.warning, isAccessibleForFree: true }} />
        </>
      )}
    </div>
  );
}
