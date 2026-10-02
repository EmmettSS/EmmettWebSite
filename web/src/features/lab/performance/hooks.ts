/**
 * F-10 measurement hooks. All observers are best-effort, never assumed:
 *  · the FPS sampler runs only on an active, visible page and yields to the browser;
 *  · Web Vitals come from PerformanceObserver with feature detection per entry type;
 *  · nothing here schedules work on the critical path (the page uses requestIdleCallback).
 */
import { useEffect, useRef, useState } from "react";
import { fpsFromDelta, fpsStats, type FpsStats } from "./metrics";

export type IdleScheduler = (callback: () => void) => void;

export function onIdle(callback: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof idle === "function") idle(callback, { timeout: 2000 });
  else setTimeout(callback, 200);
}

/** Samples real frames for `durationMs` (default 60 s) and returns honest statistics. */
export function useFpsSampler({ enabled, durationMs = 60_000, capacity = 3600 }: { enabled: boolean; durationMs?: number; capacity?: number }) {
  const [samples, setSamples] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) {
      setRunning(false);
      return;
    }
    let raf = 0;
    let last = 0;
    let start = 0;
    let stopped = false;
    const tick = (time: number) => {
      if (stopped) return;
      if (last) {
        const fps = fpsFromDelta(time - last);
        if (fps > 0) {
          samplesRef.current.push(fps);
          if (samplesRef.current.length > capacity) samplesRef.current.shift();
        }
      }
      last = time;
      if (!start) start = time;
      if (time - start >= durationMs) {
        stopped = true;
        setRunning(false);
        setSamples([...samplesRef.current]);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    setRunning(true);
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      setRunning(false);
    };
  }, [capacity, durationMs, enabled]);

  const stats: FpsStats = fpsStats(samples);
  return { samples, stats, running };
}

/** Subscribes to the PerformanceObserver entry types this browser actually supports. */
export function observePerformance(
  kinds: Array<{ type: string; requiresBuffered?: boolean }>,
  onEntries: (type: string, entries: PerformanceEntry[]) => void,
): () => void {
  const observers: Array<{ supported: boolean; disconnect: () => void }> = [];
  const supports = typeof PerformanceObserver !== "undefined" && typeof PerformanceObserver.supportedEntryTypes !== "undefined";
  if (!supports) return () => undefined;
  for (const kind of kinds) {
    if (!PerformanceObserver.supportedEntryTypes.includes(kind.type)) continue;
    try {
      const observer = new PerformanceObserver((list) => onEntries(kind.type, list.getEntries()));
      observer.observe({ type: kind.type, buffered: Boolean(kind.requiresBuffered) } as PerformanceObserverInit);
      observers.push({ supported: true, disconnect: () => observer.disconnect() });
    } catch {
      /* unsupported despite advertising it — leave it out instead of guessing */
    }
  }
  return () => {
    for (const observer of observers) observer.disconnect();
  };
}

export const OBSERVED_TYPES = [
  { type: "largest-contentful-paint", requiresBuffered: true },
  { type: "layout-shift", requiresBuffered: true },
  { type: "event", requiresBuffered: false },
  { type: "navigation", requiresBuffered: true },
  { type: "paint", requiresBuffered: true },
] as const;

export function useSupportedEntryTypes(): string[] {
  return typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes ? [...PerformanceObserver.supportedEntryTypes] : [];
}
