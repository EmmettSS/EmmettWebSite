/**
 * F-09 interactive sequence viewer — the visual peak of the feature (§2.2).
 *
 * Rendering rules:
 *  · `full`      → interactive canvas, DPR capped at 2
 *  · `balanced`  → same canvas with DPR forced to 1 and a shorter strip
 *  · `low-power` → never rendered; the analysis tab swaps in the table (`SequenceTable`)
 *
 * The draw loop is driven by state, not by a timer, and it stops whenever the canvas leaves
 * the viewport (IntersectionObserver) — the `data-viewer-active` attribute is the test hook
 * for visual-layer rules 3 and 7.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GcWindow, Orf } from "../logic";
import type { Tier } from "@/lib/device-tier";
import { biolabCopy } from "../copy";

const FRAME_COLORS = ["#3fd0a0", "#79c0ff", "#f0b429"] as const;
const REVERSE_ALPHA = "rgba(121, 192, 255, 0.55)";

export type SequenceViewerProps = {
  sequenceLength: number;
  track: number[];
  orfs: Orf[];
  regions: GcWindow[];
  tier: Tier;
  lang: "fa" | "en";
};

export function SequenceViewer({ sequenceLength, track, orfs, regions, tier, lang }: SequenceViewerProps) {
  const copy = biolabCopy[lang];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = whole sequence
  const [center, setCenter] = useState(0.5); // 0..1 centre of the visible window
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const drag = useRef<{ x: number; center: number } | null>(null);

  const height = tier === "full" ? 220 : 168;
  const maxZoom = Math.max(1, Math.min(4096, sequenceLength / 50));

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(() => {
    if (sequenceLength <= 0) return { start: 0, end: 0, span: 1 };
    const span = Math.max(50, Math.round(sequenceLength / zoom));
    const rawStart = Math.round(center * sequenceLength - span / 2);
    const start = Math.min(Math.max(0, rawStart), Math.max(0, sequenceLength - span));
    return { start, end: Math.min(sequenceLength, start + span), span };
  }, [center, sequenceLength, zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cssWidth = Math.max(120, container.clientWidth);
    const globalDpr = typeof globalThis.window !== "undefined" ? globalThis.window.devicePixelRatio || 1 : 1;
    const dpr = tier === "balanced" ? 1 : Math.min(globalDpr, 2);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssWidth, height);

    const mid = height / 2;
    context.fillStyle = "rgba(255,255,255,0.035)";
    context.fillRect(0, 0, cssWidth, height);
    context.fillStyle = "rgba(255,255,255,0.10)";
    context.fillRect(0, Math.round(mid) - 1, cssWidth, 1);

    // GC-rich regions behind everything.
    context.fillStyle = "rgba(63, 208, 160, 0.12)";
    for (const region of regions) {
      const x0 = ((region.start - viewport.start) / viewport.span) * cssWidth;
      const x1 = ((region.end - viewport.start) / viewport.span) * cssWidth;
      if (x1 < 0 || x0 > cssWidth) continue;
      context.fillRect(Math.max(0, x0), 0, Math.max(1.5, Math.min(cssWidth, x1) - Math.max(0, x0)), height);
    }

    // GC track (down-sampled buckets).
    if (track.length) {
      context.beginPath();
      context.lineWidth = 1.4;
      context.strokeStyle = "rgba(63, 208, 160, 0.85)";
      const buckets = track.length;
      for (let index = 0; index < buckets; index += 1) {
        const position = (index / (buckets - 1 || 1)) * sequenceLength;
        const x = ((position - viewport.start) / viewport.span) * cssWidth;
        const y = height - 10 - (track[index] / 100) * (mid - 26);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }

    // ORFs: forward above the axis, reverse below.
    for (const orf of orfs) {
      const x0 = ((orf.start - 1 - viewport.start) / viewport.span) * cssWidth;
      const x1 = (orf.end - viewport.start) / viewport.span * cssWidth;
      if (x1 < 0 || x0 > cssWidth) continue;
      const left = Math.max(0, x0);
      const width = Math.max(2, Math.min(cssWidth, x1) - left);
      const thickness = Math.min(22, Math.max(6, mid / 8));
      const color = FRAME_COLORS[(orf.frame - 1) % 3];
      context.fillStyle = orf.strand === "forward" ? color : REVERSE_ALPHA;
      const y = orf.strand === "forward" ? mid - thickness - 6 : mid + 6;
      context.fillRect(left, y, width, thickness);
      if (orf.complete) {
        context.fillStyle = "rgba(255,255,255,0.75)";
        context.fillRect(left + width - 2, y, 2, thickness);
      }
    }

    // Ruler.
    context.fillStyle = "rgba(255,255,255,0.5)";
    context.font = "10px ui-monospace, monospace";
    const ticks = 5;
    for (let tick = 0; tick <= ticks; tick += 1) {
      const position = viewport.start + (viewport.span * tick) / ticks;
      const x = (tick / ticks) * cssWidth;
      context.fillRect(x, height - 2, 1, 2);
      const label = String(Math.round(position)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const align = tick === 0 ? 0 : tick === ticks ? cssWidth - 34 : x - 17;
      context.fillText(label, Math.max(2, align), height - 6);
    }
  }, [height, orfs, regions, sequenceLength, tier, track, viewport.end, viewport.span, viewport.start]);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [draw, visible]);

  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const next = clamp(zoom * (event.deltaY < 0 ? 1.25 : 0.8));
    setZoom(Math.max(1, Math.min(maxZoom, next)));
  };

  const positionFromEvent = (event: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    return clamp((event.clientX - rect.left) / Math.max(1, rect.width));
  };

  const findOrfAt = (fraction: number) => {
    const position = Math.round(viewport.start + fraction * viewport.span);
    return orfs.find((orf) => position >= orf.start - 1 && position < orf.end);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) {
      const dx = (event.clientX - drag.current.x) / Math.max(1, (event.target as HTMLCanvasElement).clientWidth);
      setCenter(clamp(drag.current.center - dx));
      return;
    }
    const fraction = positionFromEvent(event);
    const orf = findOrfAt(fraction);
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    setHover({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      label: orf
        ? `${orf.start.toLocaleString("en-US")}–${orf.end.toLocaleString("en-US")} · ${copy.results.orfColumns.frame} ${orf.frame} · ${orf.lengthAa} aa`
        : `${Math.round(viewport.start + fraction * viewport.span).toLocaleString("en-US")}`,
    });
  };

  const zoomBy = (factor: number) => setZoom((current) => Math.max(1, Math.min(maxZoom, current * factor)));

  return (
    <div ref={containerRef} className="space-y-2" data-testid="sequence-viewer" data-viewer-active={visible ? "true" : "false"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/55">{copy.results.viewerHint}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => zoomBy(1.6)} className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-white/75 hover:text-white" aria-label={copy.results.zoomIn}>
            +
          </button>
          <button type="button" onClick={() => zoomBy(0.625)} className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-white/75 hover:text-white" aria-label={copy.results.zoomOut}>
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCenter(0.5);
            }}
            className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-white/75 hover:text-white"
          >
            {copy.results.reset}
          </button>
          <span className="ms-2 font-mono text-[11px] text-white/45">
            {copy.results.window} {viewport.start.toLocaleString("en-US")}–{viewport.end.toLocaleString("en-US")}
          </span>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          tabIndex={0}
          aria-label={`${copy.results.viewer}: ${sequenceLength.toLocaleString("en-US")} ${copy.input.chars}, ${orfs.length} ORF`}
          className="w-full rounded-2xl border border-[var(--line)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)]"
          onWheel={onWheel}
          onPointerDown={(event) => {
            (event.target as HTMLCanvasElement).setPointerCapture?.(event.pointerId);
            drag.current = { x: event.clientX, center };
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            setHover(null);
            drag.current = null;
          }}
          onPointerMove={onPointerMove}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setCenter((value) => clamp(value + 0.05 / zoom));
            else if (event.key === "ArrowLeft") setCenter((value) => clamp(value - 0.05 / zoom));
            else if (event.key === "+") zoomBy(1.4);
            else if (event.key === "-") zoomBy(0.7);
            else return;
            event.preventDefault();
          }}
        />
        {hover ? (
          <span
            className="pointer-events-none absolute rounded-lg border border-[var(--line)] bg-black/80 px-2 py-1 font-mono text-[11px] text-white/80"
            style={{ left: Math.max(4, hover.x + 8), top: Math.max(4, hover.y + 8) }}
          >
            {hover.label}
          </span>
        ) : null}
      </div>
      <p className="sr-only">
        {copy.results.orfTitle}: {orfs.slice(0, 5).map((orf) => `${orf.start}-${orf.end}`).join(", ")}
      </p>
    </div>
  );
}

export default SequenceViewer;
