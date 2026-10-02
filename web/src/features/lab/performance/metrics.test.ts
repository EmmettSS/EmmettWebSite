/**
 * F-10 — the lab may only show measured numbers.
 *
 * The pure helpers are unit-tested here, and the *real* CI artefact is asserted when it is
 * present (CI runs `pnpm build && pnpm budget --emit public/data` before the tests, so a
 * missing artefact in CI is a failure, not a silent skip).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  budgetRatio,
  formatKb,
  formatVital,
  fpsFromDelta,
  fpsStats,
  isBundleStats,
  measurementLabel,
  vitalFromEntry,
  vitalVerdict,
  type BundleStats,
} from "./metrics";

const artefact = path.resolve(__dirname, "..", "..", "..", "..", "public", "data", "bundle-stats.json");

describe("F-10 · frame-rate maths", () => {
  it("converts frame deltas to fps and clamps nonsense", () => {
    expect(fpsFromDelta(1000 / 60)).toBeCloseTo(60, 5);
    expect(fpsFromDelta(0)).toBe(0);
    expect(fpsFromDelta(Number.NaN)).toBe(0);
    expect(fpsFromDelta(0.1)).toBe(240); // clamped, not Infinity
  });

  it("reports average, minimum, p95 and slow-frame count", () => {
    const stats = fpsStats([60, 60, 60, 30, 15]);
    expect(stats.samples).toBe(5);
    expect(stats.avg).toBeCloseTo(45, 5);
    expect(stats.min).toBe(15);
    expect(stats.p95).toBe(60);
    expect(stats.slow).toBe(1); // strictly below 30 fps: only the 15 fps frame counts
  });

  it("returns zeroed stats for an empty sample", () => {
    expect(fpsStats([])).toEqual({ samples: 0, avg: 0, min: 0, p95: 0, slow: 0 });
  });
});

describe("F-10 · web vitals", () => {
  it("maps values to Google thresholds and verdicts", () => {
    expect(vitalVerdict(vitalFromEntry("LCP", 2000))).toBe("good");
    expect(vitalVerdict(vitalFromEntry("LCP", 3000))).toBe("needs-improvement");
    expect(vitalVerdict(vitalFromEntry("LCP", 9000))).toBe("poor");
    expect(vitalVerdict(vitalFromEntry("CLS", 0.05))).toBe("good");
    expect(vitalVerdict(vitalFromEntry("INP", 350))).toBe("needs-improvement");
  });

  it("formats scores and durations differently", () => {
    expect(formatVital(vitalFromEntry("CLS", 0.1234))).toBe("0.123");
    expect(formatVital(vitalFromEntry("LCP", 1234.6))).toBe("1235 ms");
  });
});

describe("F-10 · bundle budget rendering", () => {
  it("clamps the bar ratio so a blown budget is visible but not infinite", () => {
    expect(budgetRatio(100, 200)).toBe(0.5);
    expect(budgetRatio(300, 200)).toBe(1.5);
    expect(budgetRatio(10, 0)).toBe(1);
  });

  it("labels route measurements without the internal prefix", () => {
    expect(measurementLabel("route:biolab")).toBe("biolab");
    expect(measurementLabel("initial")).toBe("initial");
    expect(formatKb(135.4931640625)).toBe("135.5 KB");
  });

  it("rejects payloads that are not real measurements", () => {
    expect(isBundleStats(null)).toBe(false);
    expect(isBundleStats({ generatedAt: "x", measurements: [] })).toBe(false);
    expect(isBundleStats({ generatedAt: "x", measurements: [{ id: "initial", kb: 1, budgetKb: 2 }] })).toBe(true);
  });
});

describe("F-10 · the CI artefact (no mocked numbers)", () => {
  const present = existsSync(artefact);
  const stats: BundleStats | null = present ? (JSON.parse(readFileSync(artefact, "utf8")) as BundleStats) : null;

  it(present ? "comes from a real build and stays inside the published budgets" : "is produced by `pnpm build && pnpm budget --emit public/data`", () => {
    if (!present) {
      if (process.env.CI) throw new Error("bundle-stats.json missing in CI — the build/budget step must run before tests");
      expect(present).toBe(false);
      return;
    }
    expect(isBundleStats(stats)).toBe(true);
    const initial = stats!.measurements.find((entry) => entry.id === "initial")!;
    expect(initial.budgetKb).toBe(stats!.budgets.initialKb);
    expect(initial.kb).toBeGreaterThan(50); // a real bundle, not a stub
    expect(initial.kb).toBeLessThanOrEqual(initial.budgetKb);
    for (const route of stats!.measurements.filter((entry) => entry.id.startsWith("route:"))) {
      expect(route.kb, route.id).toBeLessThanOrEqual(route.budgetKb);
    }
    expect(stats!.digest).toMatch(/^[0-9a-f]{16}$/);
  });
});
