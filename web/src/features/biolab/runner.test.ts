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
    let maxGap = 0;
    let last = Date.now();
    const heartbeat = setInterval(() => {
      const now = Date.now();
      maxGap = Math.max(maxGap, now - last);
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
    // Printed evidence: the phase report quotes these exact measurements (assert-with-measurement).
    console.info(`F-09 responsiveness · 1 MB chunked: ${Date.now() - startedAt} ms total, worst main-thread gap ${maxGap} ms`);

    expect(mode).toBe("chunked");
    expect(result.length).toBe(1_000_000);
    expect(stages).toEqual(["composition", "thermo", "gc", "orfs", "codons", "done"]);
    // No single synchronous step may block the main thread for long: the browser must be able
    // to fire timers between steps (INP budget). 250 ms is a conservative upper bound for CI.
    expect(maxGap).toBeLessThan(250);
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
