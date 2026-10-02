/**
 * DataLattice — the device-tier lattice used by the performance lab (F-10).
 *
 * Each row is one tier budget (full / balanced / low-power); cells light up to show how much
 * of that tier's frame budget the current page is using. Purely visual, driven by the runtime
 * the wrapper hands over, and drawn on a DPR-capped canvas.
 */
import type { SceneRuntime } from "@/visuals/primitives/scene-runtime";
import { useSceneLoop } from "@/visuals/primitives/scene-runtime";

const ROWS = [
  { id: "full", ratio: 0.55, color: "#25c779" },
  { id: "balanced", ratio: 0.78, color: "#20b8a8" },
  { id: "low-power", ratio: 0.32, color: "#74b86b" },
] as const;

export default function DataLattice({ runtime }: { runtime: SceneRuntime }) {
  const { canvasRef, framesRef } = useSceneLoop(runtime, (context, elapsed, size) => {
    const { width, height } = size;
    context.clearRect(0, 0, width, height);
    const columns = 26;
    const cellWidth = width / columns;
    const rowHeight = height / (ROWS.length + 1);

    ROWS.forEach((row, rowIndex) => {
      const y = rowHeight * (rowIndex + 0.75);
      context.fillStyle = "rgba(255,255,255,0.45)";
      context.font = "10px ui-monospace, monospace";
      context.fillText(row.id, 8, y - 8);
      for (let column = 0; column < columns; column += 1) {
        const threshold = runtime.reducedMotion ? row.ratio : row.ratio + 0.12 * Math.sin(elapsed * 1.1 + column * 0.4 + rowIndex);
        const active = column / (columns - 1) <= threshold;
        context.globalAlpha = active ? 0.9 : 0.18;
        context.fillStyle = active ? row.color : "#3a4a44";
        const x = 8 + column * (cellWidth - 2);
        context.fillRect(x, y, Math.max(2, cellWidth - 6), rowHeight * 0.34);
      }
      context.globalAlpha = 1;
    });

    context.fillStyle = "rgba(255,255,255,0.4)";
    context.fillText(runtime.reducedMotion ? "reduced-motion · static frame" : `tier: ${runtime.tier} · dpr ${runtime.dpr}`, 8, height - 6);
  });

  return (
    <div className="h-full w-full" data-scene="DataLattice" data-scene-frames={framesRef.current}>
      <canvas ref={canvasRef} aria-hidden className="h-full w-full" />
      <p className="sr-only">
        Device tier {runtime.tier}; device pixel ratio capped at {runtime.dpr}.
      </p>
    </div>
  );
}
