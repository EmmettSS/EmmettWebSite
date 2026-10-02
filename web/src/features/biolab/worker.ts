/**
 * Web Worker for F-09: keeps large sequences off the main thread (INP budget, §5.4).
 * The worker is a thin shell around the pure logic module — no DOM, no network, no logging.
 */
import { analyze, type AnalysisOptions, type AnalysisResult, type AnalysisStage } from "./logic";

export type BioWorkerRequest = { id: number; sequence: string; options: AnalysisOptions };

export type BioWorkerResponse =
  | { id: number; type: "stage"; stage: AnalysisStage }
  | { id: number; type: "done"; result: AnalysisResult }
  | { id: number; type: "error"; message: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BioWorkerRequest>) => void) | null;
  postMessage: (message: BioWorkerResponse) => void;
};

scope.onmessage = (event: MessageEvent<BioWorkerRequest>) => {
  const { id, sequence, options } = event.data;
  try {
    const result = analyze(sequence, options, (stage) => scope.postMessage({ id, type: "stage", stage }));
    scope.postMessage({ id, type: "done", result });
  } catch (error) {
    scope.postMessage({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
