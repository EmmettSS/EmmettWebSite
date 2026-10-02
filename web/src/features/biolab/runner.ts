/**
 * Analysis runner for F-09.
 *
 * Primary path: a module Web Worker (`worker.ts`) so even a 1 MB sequence never blocks the
 * main thread. Fallback path: the same pure stages executed in the main thread with a yield
 * between them — used when Workers are unavailable (older browsers, some embedded webviews,
 * the vitest/jsdom environment). Both paths return identical results.
 */
import { createAnalysisRun, type AnalysisOptions, type AnalysisResult, type AnalysisStage } from "./logic";
import type { BioWorkerRequest, BioWorkerResponse } from "./worker";

export type AnalysisProgress = {
  stage: AnalysisStage;
  /** 1-based index of the finished step, out of `total`. */
  index: number;
  total: number;
};

export type RunAnalysisOptions = AnalysisOptions & {
  onProgress?: (progress: AnalysisProgress) => void;
  /** Force the chunked main-thread path (used by the responsiveness test). */
  forceChunked?: boolean;
};

const STAGE_TOTAL = 5; // composition, thermo, gc, orfs, codons

let workerCounter = 0;

export function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof URL !== "undefined";
}

/** Yields to the browser between steps; `scheduler.yield` is preferred when available. */
export async function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function runAnalysisChunked(sequence: string, options: RunAnalysisOptions = {}): Promise<AnalysisResult> {
  const run = createAnalysisRun(sequence, options);
  let index = 0;
  for (const step of run.steps) {
    for (const _ of step.work()) {
      await yieldToMain();
    }
    index += 1;
    options.onProgress?.({ stage: step.stage, index, total: STAGE_TOTAL });
  }
  options.onProgress?.({ stage: "done", index: STAGE_TOTAL, total: STAGE_TOTAL });
  return run.finish();
}

function runAnalysisInWorker(sequence: string, options: RunAnalysisOptions): Promise<AnalysisResult> {
  return new Promise<AnalysisResult>((resolve, reject) => {
    const id = ++workerCounter;
    let worker: Worker;
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    } catch (error) {
      reject(error);
      return;
    }
    const cleanup = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<BioWorkerResponse>) => {
      const message = event.data;
      if (message.id !== id) return;
      if (message.type === "stage") {
        options.onProgress?.({ stage: message.stage, index: 0, total: STAGE_TOTAL });
        return;
      }
      cleanup();
      if (message.type === "done") resolve(message.result);
      else reject(new Error(message.message));
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "worker failed"));
    };
    const request: BioWorkerRequest = { id, sequence, options };
    worker.postMessage(request);
  });
}

/**
 * Runs a full analysis, preferring the worker and degrading to the chunked main-thread path.
 * The fallback is not cosmetic: if a Worker cannot start, the analysis still completes and the
 * caller is told which path ran (shown in the UI as evidence, never hidden).
 */
export async function runAnalysis(
  sequence: string,
  options: RunAnalysisOptions = {},
): Promise<{ result: AnalysisResult; mode: "worker" | "chunked" }> {
  const useWorker = !options.forceChunked && workerSupported();
  if (useWorker) {
    try {
      const result = await runAnalysisInWorker(sequence, options);
      return { result, mode: "worker" };
    } catch {
      /* fall through to the chunked path below */
    }
  }
  const result = await runAnalysisChunked(sequence, options);
  return { result, mode: "chunked" };
}
