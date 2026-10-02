/** Pre-rendered fallback for `SignalFlow`: the same five stages, no animation (rule 2). */
import { useI18n } from "@/app/i18n";

const STAGES = [
  { fa: "نگهبان مسیر", en: "Route guard" },
  { fa: "صف کار", en: "Job queue" },
  { fa: "اجرای کار", en: "Worker run" },
  { fa: "Polling نتیجه", en: "Result polling" },
  { fa: "لینک امن", en: "Secure link" },
];

export function SignalFlowStatic() {
  const { lang } = useI18n();
  return (
    <ol className="flex h-full w-full flex-wrap items-center justify-center gap-2 p-4" data-scene="SignalFlowStatic">
      {STAGES.map((stage, index) => (
        <li key={stage.en} className="flex items-center gap-2">
          <span className="rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-xs text-white/80">{stage[lang]}</span>
          {index < STAGES.length - 1 ? (
            <span aria-hidden className="text-white/30">
              {lang === "fa" ? "←" : "→"}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default SignalFlowStatic;
