/**
 * SignalFlow — how one request moves through the stack (guard → queue → job → poll → result).
 * SVG only: the pulses are CSS animations on `<circle>`/`<path>` elements, which the browser
 * composites on the GPU and which pause completely when the scene is inactive (rule 7).
 */
import { useI18n } from "@/app/i18n";
import type { SceneRuntime } from "@/visuals/primitives/scene-runtime";

const STAGES = [
  { id: "guard", fa: "نگهبان مسیر", en: "Route guard" },
  { id: "queue", fa: "صف کار", en: "Job queue" },
  { id: "worker", fa: "اجرای کار", en: "Worker run" },
  { id: "poll", fa: "Polling نتیجه", en: "Result polling" },
  { id: "share", fa: "لینک امن", en: "Secure link" },
];

export default function SignalFlow({ runtime }: { runtime: SceneRuntime }) {
  const { lang } = useI18n();
  const animated = runtime.active && !runtime.reducedMotion;

  return (
    <div className="h-full w-full" data-scene="SignalFlow" data-scene-active={animated ? "true" : "false"}>
      <svg viewBox="0 0 600 200" className="h-full w-full" role="img" aria-label={lang === "fa" ? "مسیر یک درخواست از نگهبان تا لینک نتیجه" : "How one request travels from the guard to the result link"}>
        <defs>
          <linearGradient id="signal-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#25c779" />
            <stop offset="50%" stopColor="#20b8a8" />
            <stop offset="100%" stopColor="#9a83d7" />
          </linearGradient>
        </defs>
        <path d="M 40 100 H 560" stroke="url(#signal-line)" strokeOpacity="0.35" strokeWidth="2" fill="none" />
        {STAGES.map((stage, index) => {
          const x = 40 + index * 130;
          return (
            <g key={stage.id}>
              <circle cx={x} cy={100} r="16" fill="#06120c" stroke="#25c779" strokeWidth="1.5" strokeOpacity={0.7} />
              <text x={x} y={80} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.72)">
                {lang === "fa" ? stage.fa : stage.en}
              </text>
              {animated ? (
                <circle cx={x} cy={100} r="4" fill="#3fd0a0">
                  <animate attributeName="r" values="3;6;3" dur="2.4s" begin={`${index * 0.35}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;1;0.55" dur="2.4s" begin={`${index * 0.35}s`} repeatCount="indefinite" />
                </circle>
              ) : (
                <circle cx={x} cy={100} r="4" fill="#3fd0a0" opacity="0.6" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
