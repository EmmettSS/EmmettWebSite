/**
 * Shared canvas helpers for the visual scenes.
 *
 * Rules from prompt §3.3 that live here:
 *  · DPR is always capped (2 in `full`, 1 in `balanced`) — see `resolveDpr`.
 *  · The render loop only runs while the scene is active (viewport + tier + reduced motion).
 *  · Nothing here changes the container's height/width, so CLS stays at 0 (rule 6).
 */
import { useEffect, useRef } from "react";
import type { Tier } from "@/lib/device-tier";

export const MAX_DPR = 2;

export function resolveDpr(tier: Tier): number {
  if (tier === "balanced") return 1;
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, MAX_DPR);
}

export type SceneRuntime = {
  tier: Tier;
  dpr: number;
  active: boolean;
  reducedMotion: boolean;
  /** Frame ceiling: `balanced` is capped to keep thermals and INP in check. */
  fpsCap: number;
};

export function frameIntervalMs(runtime: Pick<SceneRuntime, "tier">): number {
  return runtime.tier === "balanced" ? 1000 / 24 : 1000 / 60;
}

/** Resizes a canvas to its CSS box at the capped DPR; never touches layout itself. */
export function sizeCanvas(canvas: HTMLCanvasElement, dpr: number): CanvasRenderingContext2D | null {
  const parent = canvas.parentElement;
  if (!parent) return null;
  const width = Math.max(1, Math.round(parent.clientWidth));
  const height = Math.max(1, Math.round(parent.clientHeight));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return context;
}

/**
 * Animation loop that respects the runtime contract. `draw` receives elapsed seconds.
 * Returns nothing; the loop is torn down on unmount or when `runtime.active` turns false.
 */
export function useSceneLoop(runtime: SceneRuntime, draw: (context: CanvasRenderingContext2D, elapsed: number, size: { width: number; height: number }) => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef(0);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !runtime.active) return;
    const context = sizeCanvas(canvas, runtime.dpr);
    if (!context) return;
    let raf = 0;
    let last = 0;
    let start = 0;
    const interval = frameIntervalMs(runtime);
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      if (time - last < interval) return;
      last = time;
      if (!start) start = time;
      const parent = canvas.parentElement;
      if (!parent) return;
      drawRef.current(context, (time - start) / 1000, { width: parent.clientWidth, height: parent.clientHeight });
      framesRef.current += 1;
      // Test/observability hook only — never a React state update, so animating costs no renders.
      canvas.dataset.sceneFrames = String(framesRef.current);
    };
    const resize = () => {
      const next = sizeCanvas(canvas, runtime.dpr);
      if (next) drawRef.current(next, 0, { width: canvas.parentElement?.clientWidth ?? 0, height: canvas.parentElement?.clientHeight ?? 0 });
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [runtime.active, runtime.dpr, runtime.tier]);

  return { canvasRef, framesRef };
}
