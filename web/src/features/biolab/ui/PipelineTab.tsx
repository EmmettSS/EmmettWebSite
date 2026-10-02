/**
 * F-09 tab 3 — the lab pipeline diagram.
 *
 * G1 / card rule 4: the numbers must come from `SiteConfig` (admin-editable, no deploy).
 * When the team has not filled them in, the tab shows an explicit not-configured state
 * instead of a flattering invented number. Nothing here is hard-coded.
 */
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { biolabCopy } from "../copy";

type SiteConfigResponse = {
  lab_samples_per_day: number | null;
  lab_turnaround_hours: number | null;
  lab_tests_per_sample: number | null;
};

export function PipelineTab({ lang }: { lang: "fa" | "en" }) {
  const copy = biolabCopy[lang].pipeline;
  const [state, setState] = useState<{ status: "loading" | "ready" | "offline"; config?: SiteConfigResponse }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiGet<SiteConfigResponse>("/site-config/")
      .then((config) => {
        if (!cancelled) setState({ status: "ready", config });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "offline" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const config = state.config;
  const configured = Boolean(config && (config.lab_samples_per_day || config.lab_turnaround_hours || config.lab_tests_per_sample));
  const stages = [
    { key: "stageIntake", value: null },
    { key: "stageAccession", value: config?.lab_samples_per_day ?? null, unit: copy.samplesPerDay },
    { key: "stageTest", value: config?.lab_tests_per_sample ?? null, unit: copy.testsPerSample },
    { key: "stageResult", value: config?.lab_turnaround_hours ?? null, unit: copy.hours },
  ] as const;

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-white/85">{copy.title}</h3>
      <p className="text-xs leading-6 text-white/55">{copy.intro}</p>

      {state.status === "offline" ? <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100">{copy.offline}</p> : null}
      {state.status === "ready" && !configured ? (
        <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100" data-testid="pipeline-not-configured">
          {biolabCopy[lang].notices.inputB10}
        </p>
      ) : null}

      <ol className="grid gap-3 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <li key={stage.key} className="relative rounded-2xl border border-[var(--line)] bg-black/20 p-4">
            <span className="font-mono text-[11px] text-white/40">{String(index + 1).padStart(2, "0")}</span>
            <p className="mt-1 text-sm font-semibold text-white/85">{copy[stage.key]}</p>
            <p className="mt-2 font-mono text-sm text-[var(--bright)]">
              {stage.value === null ? copy.notConfigured : `${stage.value.toLocaleString("en-US")}`}
            </p>
            {"unit" in stage && stage.unit && stage.value !== null ? <p className="text-[11px] text-white/45">{stage.unit}</p> : null}
            {index < stages.length - 1 ? (
              <span aria-hidden className="absolute -bottom-2 start-6 text-white/30 lg:-end-2 lg:top-1/2 lg:bottom-auto">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="text-[11px] leading-6 text-white/45">{copy.marker}</p>
    </div>
  );
}
