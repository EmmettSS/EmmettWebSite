import { describe, expect, it } from "vitest";

import { analyze } from "@/features/biolab/logic";
import { runAnalysis, runAnalysisChunked, workerSupported } from "@/features/biolab/runner";
import { REFERENCE_SAMPLE } from "@/features/biolab/data/reference";

/** Deterministic 1 MB sequence (LCG) — the acceptance-test workload from the F-09 card. */
function bigSequence(length: number): string {
  const letters = "ACGT";
  let state = 42;
  const chunks: string[] = [];
  for (let index = 0; index < length; index += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    chunks.push(letters[state % 4]);
  }
  return chunks.join("");
}

describe("F-09 · analysis runner", () => {
  it("runs a 1 MB sequence without freezing the event loop (chunked fallback path)", async () => {
    const sequence = bigSequence(1_000_000);
    const startedAt = Date.now();
    const gaps: number[] = [];
    let last = Date.now();
    const heartbeat = setInterval(() => {
      const now = Date.now();
      gaps.push(now - last);
      last = now;
    }, 5);
    const stages: string[] = [];

    const { result, mode } = await runAnalysis(sequence, {
      forceChunked: true,
      minOrfAa: 100,
      orfLimit: 5,
      onProgress: (progress) => stages.push(progress.stage),
    });
    clearInterval(heartbeat);
    const total = Date.now() - startedAt;
    const maxGap = Math.max(...gaps, 0);
    const meanGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;
    // Printed evidence: the phase report quotes these exact measurements (assert-with-measurement).
    console.info(
      `F-09 responsiveness · 1 MB chunked: ${total} ms total, ${gaps.length} heartbeat ticks, ` +
        `mean gap ${meanGap.toFixed(1)} ms, worst main-thread gap ${maxGap} ms`,
    );

    expect(mode).toBe("chunked");
    expect(result.length).toBe(1_000_000);
    expect(stages).toEqual(["composition", "thermo", "gc", "orfs", "codons", "done"]);
    // The event loop must keep firing throughout the run: many ticks, and no single step that
    // blocks for an order of magnitude longer than the ticks of the same machine. The ratio is
    // load-independent (a busy CI box stretches both numbers), unlike a bare millisecond cap.
    expect(gaps.length).toBeGreaterThan(20);
    // Absolute INP-style ceiling: no single main-thread step may exceed this (measured ~65 ms).
    expect(maxGap).toBeLessThan(250);
    // Machine-relative guard: the worst gap must stay in the same order as the tick rhythm of
    // the machine running the test, so a loaded CI box does not turn this into a flake.
    expect(maxGap).toBeLessThan(meanGap * 12);
    expect(result.composition.counts.A + result.composition.counts.C + result.composition.counts.G + result.composition.counts.T).toBe(1_000_000);
  }, 60_000);

  it("produces exactly the same numbers as the synchronous analyse() path", async () => {
    const reference = analyze(parseSample(), { minOrfAa: 200, orfLimit: 10 });
    const chunked = await runAnalysisChunked(parseSample(), { minOrfAa: 200, orfLimit: 10 });

    expect(chunked.composition).toEqual(reference.composition);
    expect(chunked.tm).toEqual(reference.tm);
    expect(chunked.longestOrf?.lengthAa).toBe(reference.longestOrf?.lengthAa);
    expect(chunked.codonUsage).toEqual(reference.codonUsage);
    expect(chunked.gcRegions).toEqual(reference.gcRegions);
  });

  it("reports which path ran and falls back when no Worker exists", async () => {
    expect(workerSupported()).toBe(false); // vitest runs in Node: the honest fallback is exercised
    const { mode } = await runAnalysis("ATGCGTACGTTAGCTAGCTAGCATCGATCGTAA", { minOrfAa: 5 });
    expect(mode).toBe("chunked");
  });
});

function parseSample(): string {
  return REFERENCE_SAMPLE.fasta
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("")
    .toUpperCase();
}
