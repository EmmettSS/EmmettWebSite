/**
 * F-10 — pure measurement helpers.
 *
 * Everything the Performance Lab shows is derived here from *observed* values: rAF deltas,
 * PerformanceObserver entries and the build artefact emitted by `scripts/bundle-budget.ts`.
 * There is no synthetic/placeholder number anywhere in this module.
 */

export type FpsStats = {
  samples: number;
  avg: number;
  min: number;
  p95: number;
  /** Frames that took longer than 1/30 s — the honest "jank" count for a 60 s window. */
  slow: number;
};

export function fpsFromDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.min(240, 1000 / deltaMs);
}

export function fpsStats(samples: number[]): FpsStats {
  if (samples.length === 0) return { samples: 0, avg: 0, min: 0, p95: 0, slow: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((total, value) => total + value, 0);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    samples: samples.length,
    avg: sum / samples.length,
    min: sorted[0],
    p95: sorted[p95Index],
    slow: samples.filter((value) => value < 30).length,
  };
}

export type VitalKind = "LCP" | "CLS" | "INP" | "TTFB" | "FCP";

export type Vital = {
  kind: VitalKind;
  value: number;
  unit: "ms" | "score";
  /** Google's published "good" threshold, so the page can show pass/fail honestly. */
  goodMax: number;
  supported: boolean;
};

export const VITAL_THRESHOLDS: Record<VitalKind, { unit: "ms" | "score"; goodMax: number; label: { fa: string; en: string } }> = {
  LCP: { unit: "ms", goodMax: 2500, label: { fa: "بزرگ‌ترین محتوای دیدنی", en: "Largest contentful paint" } },
  CLS: { unit: "score", goodMax: 0.1, label: { fa: "جابه‌جایی چیدمان", en: "Cumulative layout shift" } },
  INP: { unit: "ms", goodMax: 200, label: { fa: "تأخیر تعامل", en: "Interaction to next paint" } },
  TTFB: { unit: "ms", goodMax: 800, label: { fa: "زمان اولین بایت", en: "Time to first byte" } },
  FCP: { unit: "ms", goodMax: 1800, label: { fa: "اولین رنگ‌آمیزی", en: "First contentful paint" } },
};

export function vitalFromEntry(kind: VitalKind, value: number): Vital {
  const threshold = VITAL_THRESHOLDS[kind];
  return { kind, value, unit: threshold.unit, goodMax: threshold.goodMax, supported: Number.isFinite(value) };
}

export function vitalVerdict(vital: Vital): "good" | "needs-improvement" | "poor" {
  if (vital.value <= vital.goodMax) return "good";
  if (vital.value <= vital.goodMax * 2) return "needs-improvement";
  return "poor";
}

export function formatVital(vital: Vital): string {
  return vital.unit === "score" ? vital.value.toFixed(3) : `${Math.round(vital.value)} ms`;
}

export type BundleMeasurement = { id: string; kb: number; budgetKb: number };

export type BundleStats = {
  generatedAt: string;
  source: string;
  budgets: { initialKb: number; routeKb: number };
  measurements: BundleMeasurement[];
  history: { at: string; initialKb: number; worstRoute: string }[];
  digest: string;
};

export function budgetRatio(kb: number, budgetKb: number): number {
  if (budgetKb <= 0) return 1;
  return Math.min(1.5, kb / budgetKb);
}

export function formatKb(kb: number): string {
  return `${kb.toFixed(1)} KB`;
}

/** Route ids arrive as `route:<slug>`; the table shows just the slug. */
export function measurementLabel(id: string): string {
  return id.startsWith("route:") ? id.slice("route:".length) : id;
}

export function isBundleStats(value: unknown): value is BundleStats {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BundleStats>;
  return (
    typeof candidate.generatedAt === "string" &&
    Array.isArray(candidate.measurements) &&
    candidate.measurements.length > 0 &&
    candidate.measurements.every((entry) => typeof entry?.id === "string" && typeof entry?.kb === "number" && typeof entry?.budgetKb === "number")
  );
}
