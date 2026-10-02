/**
 * F-10 — Performance Lab (`/fa/lab/performance/`, `/en/lab/performance/`).
 *
 * Radical transparency, honestly scoped: every number on this page is measured — frame deltas,
 * PerformanceObserver entries, or the build artefact emitted by the bundle gate. Where a browser
 * cannot measure something, the page says so instead of filling the gap.
 *
 * Guards (card §F-10): this route is lazy-loaded so it cannot break the very budget it reports,
 * and in `low-power` the FPS chart is disabled and replaced by a table.
 */
import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Radio } from "lucide-react";
import { Link } from "react-router";
import { Footer } from "@/app/components/Footer";
import { useI18n } from "@/app/i18n";
import { useTier } from "@/lib/device-tier";
import { describeTier } from "@/lib/device-tier";
import { useSEO } from "@/lib/seo";
import { trackGoal, trackEvent } from "@/lib/analytics";
import { SignalFlowStatic } from "@/visuals/fallbacks/SignalFlowStatic";
import { TierScene } from "@/visuals/TierScene";
import { loadBundleStats } from "./data";
import { OBSERVED_TYPES, onIdle, useFpsSampler, useSupportedEntryTypes } from "./hooks";
import {
  VITAL_THRESHOLDS,
  budgetRatio,
  formatKb,
  formatVital,
  measurementLabel,
  vitalFromEntry,
  vitalVerdict,
  type BundleStats,
  type Vital,
  type VitalKind,
} from "./metrics";

const COPY = {
  fa: {
    eyebrow: "آزمایشگاه کارایی",
    title: "همان چیزی که",
    accent: "اندازه می‌گیریم.",
    intro:
      "این صفحه اعداد واقعی خودش را نشان می‌دهد: حجم باندل از خروجی build، شاخص‌های تجربهٔ همین بازدیدکننده و FPS همان دستگاهی که در دست دارید. هیچ عددی تخمینی نیست و هر بخش می‌گوید چه چیزی را نمی‌تواند اندازه بگیرد.",
    tierTitle: "سطح دستگاه شما",
    tierReason: "چرا این سطح انتخاب شد",
    cores: "هسته‌های CPU",
    memory: "حافظهٔ تخمینی (GB)",
    reduced: "کاهش حرکت",
    override: "حالت کم‌مصرف دستی",
    on: "روشن",
    off: "خاموش",
    auto: "خودکار",
    vitalsTitle: "شاخص‌های تجربهٔ همین بازدیدکننده",
    vitalsNote: "مقادیر از PerformanceObserver می‌آیند؛ اگر مرورگر شاخصی را پشتیبانی نکند، همان‌جا نوشته می‌شود.",
    vitalsWaiting: "در حال اندازه‌گیری…",
    notSupported: "در این مرورگر قابل اندازه‌گیری نیست",
    good: "خوب",
    needs: "نیازمند بهبود",
    poor: "ضعیف",
    threshold: "حد خوب",
    bundleTitle: "حجم واقعی باندل (از CI)",
    bundleNote: "این اعداد از همان فرمانی می‌آیند که CI را fail می‌کند اگر از بودجه بگذریم.",
    bundleUnavailable: "آرتفت CI در دسترس نیست؛ عددی نمایش داده نمی‌شود. (اجرای build و budget در CI این فایل را می‌سازد.)",
    bundleInitial: "بارگذاری اولیه",
    bundleRoute: "روت‌ها",
    digest: "digest",
    generatedAt: "زمان اندازه‌گیری",
    fpsTitle: "نرخ فریم زنده (۶۰ ثانیه)",
    fpsNote: "اندازه‌گیری با requestAnimationFrame و فقط وقتی صفحه در دید و فعال است.",
    fpsStart: "شروع اندازه‌گیری ۶۰ ثانیه‌ای",
    fpsRunning: "در حال اندازه‌گیری…",
    fpsAvg: "میانگین",
    fpsMin: "کمینه",
    fpsP95: "صدک ۹۵",
    fpsSlow: "فریم کند (< ۳۰)",
    fpsDisabled: "در حالت کم‌مصرف، نمودار FPS عمداً غیرفعال است. اعداد بودجهٔ همان سطح در جدول آمده‌اند.",
    tierTable: "بودجهٔ هر سطح دستگاه",
    cta: "همین انضباط را برای سامانهٔ شما هم اعمال می‌کنیم.",
    ctaButton: "گفت‌وگو با ما",
    flowTitle: "مسیر اندازه‌گیری",
  },
  en: {
    eyebrow: "PERFORMANCE LAB",
    title: "Exactly what we",
    accent: "measure.",
    intro:
      "This page shows its own real numbers: bundle sizes from the build output, this visitor's Core Web Vitals and the frame rate of the device in your hands. Nothing is estimated, and each section states what it cannot measure.",
    tierTitle: "Your device tier",
    tierReason: "Why this tier was chosen",
    cores: "CPU cores",
    memory: "Approx. memory (GB)",
    reduced: "Reduced motion",
    override: "Manual low-power mode",
    on: "on",
    off: "off",
    auto: "auto",
    vitalsTitle: "This visitor's Core Web Vitals",
    vitalsNote: "Values come from PerformanceObserver; a metric your browser does not support is labelled as such.",
    vitalsWaiting: "Measuring…",
    notSupported: "Not measurable in this browser",
    good: "good",
    needs: "needs improvement",
    poor: "poor",
    threshold: "good threshold",
    bundleTitle: "Real bundle sizes (from CI)",
    bundleNote: "These are the same numbers the CI gate fails on when a budget is exceeded.",
    bundleUnavailable: "The CI artefact is unavailable, so no numbers are shown. (CI builds it with `pnpm build && pnpm budget --emit public/data`.)",
    bundleInitial: "Initial load",
    bundleRoute: "Routes",
    digest: "digest",
    generatedAt: "Measured at",
    fpsTitle: "Live frame rate (60 s)",
    fpsNote: "Sampled with requestAnimationFrame, only while the page is visible and active.",
    fpsStart: "Start the 60-second measurement",
    fpsRunning: "Measuring…",
    fpsAvg: "Average",
    fpsMin: "Minimum",
    fpsP95: "95th percentile",
    fpsSlow: "Slow frames (< 30)",
    fpsDisabled: "In low-power mode the FPS chart is deliberately disabled. The budget numbers for that tier are in the table.",
    tierTable: "Frame budget per device tier",
    cta: "We apply the same discipline to your system.",
    ctaButton: "Talk to us",
    flowTitle: "Measurement path",
  },
} as const;

export default function PerformanceLab() {
  const { lang, path } = useI18n();
  const copy = COPY[lang];
  const { tier, override } = useTier();
  const diagnostics = useMemo(() => describeTier(tier, override), [override, tier]);

  const [bundle, setBundle] = useState<{ status: "loading" | "ready" | "missing"; stats: BundleStats | null }>({ status: "loading", stats: null });
  const [vitals, setVitals] = useState<Partial<Record<VitalKind, Vital>>>({});
  const [started, setStarted] = useState(false);
  const supportedTypes = useSupportedEntryTypes();

  useSEO({
    title: lang === "fa" ? "آزمایشگاه کارایی امت | اعداد واقعی همین سایت" : "Emmett performance lab — this site's real numbers",
    description: copy.intro,
    canonical: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/lab/performance/`,
    lang,
    image: `${typeof window !== "undefined" ? window.location.origin : ""}/og/lab-performance-${lang}.png`,
  });

  useEffect(() => {
    onIdle(() => {
      void loadBundleStats().then((stats) => {
        setBundle({ status: stats ? "ready" : "missing", stats });
      });
    });
  }, []);

  useEffect(() => {
    let cleanup = () => undefined as void;
    onIdle(() => {
      const values: Partial<Record<VitalKind, Vital>> = {};
      const accepted: Partial<Record<VitalKind, number>> = {};
      const commit = (kind: VitalKind, value: number) => {
        if (!Number.isFinite(value)) return;
        if (kind === "LCP" && value <= (accepted.LCP ?? 0)) return;
        if (kind === "INP" && value <= (accepted.INP ?? 0)) return;
        if (kind === "CLS") value = Math.max(0, value);
        accepted[kind] = value;
        values[kind] = vitalFromEntry(kind, value);
        setVitals({ ...values });
      };
      cleanup = observeTypes((type, entries) => {
        if (type === "largest-contentful-paint") {
          const last = entries[entries.length - 1];
          if (last) commit("LCP", last.startTime);
        } else if (type === "layout-shift") {
          const shift = entries.reduce((sum, entry) => sum + ((entry as PerformanceEntry & { value?: number }).value ?? 0), 0);
          commit("CLS", shift);
        } else if (type === "event") {
          const durations = entries.map((entry) => (entry as PerformanceEntry & { duration: number }).duration).filter((value) => value > 0);
          if (durations.length) commit("INP", Math.max(...durations));
        } else if (type === "navigation") {
          const nav = entries[0] as PerformanceNavigationTiming | undefined;
          if (nav) commit("TTFB", nav.responseStart);
        } else if (type === "paint") {
          const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
          if (fcp) commit("FCP", fcp.startTime);
        }
      });
    });
    return () => cleanup();
  }, []);

  const fpsEnabled = tier !== "low-power" && started;
  const { samples, stats, running } = useFpsSampler({ enabled: fpsEnabled });

  const initial = bundle.stats?.measurements.find((measurement) => measurement.id === "initial") ?? null;
  const routes = bundle.stats?.measurements.filter((measurement) => measurement.id.startsWith("route:")) ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="mx-auto max-w-[1280px] px-6 pb-14 pt-24 lg:px-12">
        <div className="eyebrow">
          <span />
          {copy.eyebrow}
        </div>
        <h1 className="hero-title">
          {copy.title}
          <br />
          <em>{copy.accent}</em>
        </h1>
        <p className="hero-copy">{copy.intro}</p>
      </section>

      {/* Device tier + why */}
      <section className="mx-auto max-w-[1280px] px-6 pb-14 lg:px-12" aria-labelledby="tier-card">
        <h2 id="tier-card" className="flex items-center gap-3 text-2xl">
          <Gauge className="h-5 w-5 text-[var(--bright)]" />
          {copy.tierTitle}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4" data-testid="tier-card" data-tier={tier}>
          {[
            { label: copy.cores, value: diagnostics.hardwareConcurrency ?? "—" },
            { label: copy.memory, value: diagnostics.deviceMemory ?? "—" },
            { label: copy.reduced, value: diagnostics.reducedMotion ? copy.on : copy.off },
            { label: copy.override, value: override === "low-power" ? copy.on : copy.auto },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
              <p className="text-xs text-white/50">{item.label}</p>
              <p className="mt-2 font-mono text-lg text-[var(--bright)]">{String(item.value)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45" data-testid="tier-reason">
          {copy.tierReason}: <span className="font-mono">{tier}</span>
        </p>
      </section>

      {/* Vitals */}
      <section className="mx-auto max-w-[1280px] px-6 pb-14 lg:px-12" aria-labelledby="vitals">
        <h2 id="vitals" className="flex items-center gap-3 text-2xl">
          <Activity className="h-5 w-5 text-[var(--bright)]" />
          {copy.vitalsTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-white/50">{copy.vitalsNote}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5" data-testid="vitals">
          {(Object.keys(VITAL_THRESHOLDS) as VitalKind[]).map((kind) => {
            const vital = vitals[kind];
            const verdict = vital ? vitalVerdict(vital) : null;
            return (
              <div key={kind} className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
                <p className="text-xs text-white/50">{VITAL_THRESHOLDS[kind].label[lang]}</p>
                <p className="mt-2 font-mono text-lg text-white/90" data-vital={kind}>
                  {vital ? formatVital(vital) : supportedTypes.length ? copy.vitalsWaiting : copy.notSupported}
                </p>
                <p className="mt-2 text-[11px] text-white/40">
                  {copy.threshold}: {VITAL_THRESHOLDS[kind].unit === "score" ? VITAL_THRESHOLDS[kind].goodMax : `${VITAL_THRESHOLDS[kind].goodMax} ms`}
                  {verdict ? ` · ${verdict === "good" ? copy.good : verdict === "needs-improvement" ? copy.needs : copy.poor}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bundle truth */}
      <section className="mx-auto max-w-[1280px] px-6 pb-14 lg:px-12" aria-labelledby="bundle">
        <h2 id="bundle" className="text-2xl">
          {copy.bundleTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-white/50">{copy.bundleNote}</p>
        {bundle.status === "ready" && bundle.stats ? (
          <div className="mt-6 space-y-4" data-testid="bundle-table">
            {initial ? (
              <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-white/85">{copy.bundleInitial}</span>
                  <span className="font-mono text-sm text-[var(--bright)]">
                    {formatKb(initial.kb)} / {initial.budgetKb} KB
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--bright)]" style={{ width: `${budgetRatio(initial.kb, initial.budgetKb) * 100}%` }} />
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
              <p className="text-sm text-white/85">{copy.bundleRoute}</p>
              <ul className="mt-4 space-y-2">
                {routes.map((route) => (
                  <li key={route.id} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-xs">
                    <span className="font-mono text-white/70">{measurementLabel(route.id)}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-[var(--emerald)]" style={{ width: `${budgetRatio(route.kb, route.budgetKb) * 100}%` }} />
                    </span>
                    <span className="font-mono text-white/60">
                      {formatKb(route.kb)} / {route.budgetKb}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-[10px] text-white/40">
                {copy.generatedAt}: {bundle.stats.generatedAt} · {copy.digest}: {bundle.stats.digest}
              </p>
            </div>
          </div>
        ) : bundle.status === "loading" ? (
          <p className="mt-6 text-xs text-white/50">{copy.vitalsWaiting}</p>
        ) : (
          <p className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs text-amber-100" data-testid="bundle-missing">
            {copy.bundleUnavailable}
          </p>
        )}
      </section>

      {/* FPS */}
      <section className="mx-auto max-w-[1280px] px-6 pb-14 lg:px-12" aria-labelledby="fps">
        <h2 id="fps" className="flex items-center gap-3 text-2xl">
          <Radio className="h-5 w-5 text-[var(--bright)]" />
          {copy.fpsTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-white/50">{copy.fpsNote}</p>
        {tier === "low-power" ? (
          <div className="mt-6 space-y-4" data-testid="fps-disabled">
            <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs text-white/60">{copy.fpsDisabled}</p>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
              <table className="w-full text-start text-xs text-white/70">
                <caption className="p-3 text-start text-xs text-white/50">{copy.tierTable}</caption>
                <thead className="bg-white/5 text-white/50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-start font-medium">tier</th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">frames</th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">DPR</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["full", "60 fps", "≤ 2"],
                    ["balanced", "24 fps", "1"],
                    ["low-power", "no live scene", "—"],
                  ].map(([rowTier, frames, dpr]) => (
                    <tr key={rowTier} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2 font-mono">{rowTier}</td>
                      <td className="px-3 py-2">{frames}</td>
                      <td className="px-3 py-2">{dpr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4" data-testid="fps-chart">
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                trackGoal("performance_fps_run", tier);
              }}
              disabled={running}
              className="rounded-xl bg-[var(--bright)] px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              {running ? copy.fpsRunning : copy.fpsStart}
            </button>
            <FpsChart samples={samples} label={copy.fpsTitle} />
            <dl className="grid gap-4 sm:grid-cols-4">
              {[
                { label: copy.fpsAvg, value: stats.samples ? stats.avg.toFixed(1) : "—" },
                { label: copy.fpsMin, value: stats.samples ? stats.min.toFixed(1) : "—" },
                { label: copy.fpsP95, value: stats.samples ? stats.p95.toFixed(1) : "—" },
                { label: copy.fpsSlow, value: String(stats.slow) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
                  <dt className="text-xs text-white/50">{item.label}</dt>
                  <dd className="mt-1 font-mono text-lg text-[var(--bright)]">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-white/40">
              {supportedTypes.includes("largest-contentful-paint") ? "" : copy.notSupported}
            </p>
          </div>
        )}
      </section>

      {/* The visual layer, measured not decorative */}
      <section className="mx-auto max-w-[1280px] px-6 pb-20 lg:px-12" aria-labelledby="flow">
        <h2 id="flow" className="text-2xl">
          {copy.flowTitle}
        </h2>
        <div className="mt-6">
          <TierScene scene="SignalFlow" height={200} fallback={<SignalFlowStatic />} />
        </div>
      </section>

      <section className="mx-4 mb-4 rounded-[2rem] bg-[var(--emerald)] px-6 py-20 text-[var(--deep)] lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-4xl text-4xl font-medium leading-[1.08] tracking-[-.03em] lg:text-6xl">{copy.cta}</h2>
          <Link
            to={path("contact")}
            onClick={() => trackEvent("performance_cta", "lab-performance")}
            className="mt-9 inline-flex rounded-full bg-[var(--deep)] px-7 py-4 font-semibold text-white"
          >
            {copy.ctaButton}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

/** Canvas chart of the sampled frame rate; a table view is used off-canvas tiers instead. */
function FpsChart({ samples, label }: { samples: number[]; label: string }) {
  return (
    <figure className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
      <figcaption className="sr-only">{label}</figcaption>
      <svg viewBox={`0 0 ${Math.max(60, samples.length)} 120`} className="h-32 w-full" role="img" aria-label={label} data-testid="fps-svg">
        <line x1="0" y1="60" x2={Math.max(60, samples.length)} y2="60" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <line x1="0" y1="30" x2={Math.max(60, samples.length)} y2="30" stroke="rgba(63,208,160,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
        <polyline
          fill="none"
          stroke="#3fd0a0"
          strokeWidth="1"
          points={samples.map((fps, index) => `${index},${120 - Math.min(120, (fps / 120) * 120)}`).join(" ")}
        />
      </svg>
      <p className="mt-2 text-[11px] text-white/40">{samples.length ? `${samples.length} frames sampled` : "—"}</p>
    </figure>
  );
}

/** Thin wrapper so the page reads cleanly; `observePerformance` owns feature detection. */
function observeTypes(onEntries: (type: string, entries: PerformanceEntry[]) => void): () => void {
  const observers: Array<{ disconnect: () => void }> = [];
  if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes) return () => undefined;
  for (const kind of OBSERVED_TYPES) {
    if (!PerformanceObserver.supportedEntryTypes.includes(kind.type)) continue;
    try {
      const observer = new PerformanceObserver((list) => onEntries(kind.type, list.getEntries()));
      observer.observe({ type: kind.type, buffered: kind.requiresBuffered } as PerformanceObserverInit);
      observers.push({ disconnect: () => observer.disconnect() });
    } catch {
      /* not usable in this browser */
    }
  }
  return () => {
    for (const observer of observers) observer.disconnect();
  };
}
