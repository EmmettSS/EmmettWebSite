/**
 * HeroSystem — the signature scene (prompt §3.4), replacing the removed `NeuralNetwork3D`.
 *
 * It is *meaningful*, not decorative:
 *  · each node is one of the five team capabilities;
 *  · each edge states how two capabilities combine;
 *  · clicking a node opens the live artifact that proves that capability (G1).
 *
 * Rendering: canvas for the network, real DOM links layered on top for clicks, hover and
 * keyboard access. DPR comes from `runtime` (≤2, =1 in `balanced`) and the loop stops when
 * the scene leaves the viewport.
 */
import { useState } from "react";
import { Link } from "react-router";
import { useI18n } from "@/app/i18n";
import type { SceneRuntime } from "@/visuals/primitives/scene-runtime";
import { useSceneLoop } from "@/visuals/primitives/scene-runtime";
import {
  CAPABILITY_EDGES,
  CAPABILITY_NODES,
  capabilityColor,
  evidencePathFor,
  entryForCapability,
  labelFor,
  type CapabilityNode,
} from "@/visuals/primitives/capabilities";
import type { Capability } from "@/features/registry";

type Point = { x: number; y: number };

/** Layout in percentages so the scene scales with its container without measuring in JS. */
const LAYOUT: Record<Capability, Point> = {
  frontend: { x: 16, y: 26 },
  backend: { x: 50, y: 44 },
  security: { x: 84, y: 26 },
  ai: { x: 30, y: 80 },
  biotech: { x: 72, y: 80 },
};

export default function HeroSystem({ runtime }: { runtime: SceneRuntime }) {
  const { lang } = useI18n();
  const [hovered, setHovered] = useState<Capability | null>(null);

  const { canvasRef, framesRef } = useSceneLoop(runtime, (context, elapsed, size) => {
    const { width, height } = size;
    context.clearRect(0, 0, width, height);
    const point = (capability: Capability): Point => ({ x: (LAYOUT[capability].x / 100) * width, y: (LAYOUT[capability].y / 100) * height });

    // Edges first, so the nodes sit on top.
    for (const edge of CAPABILITY_EDGES) {
      const from = point(edge.from);
      const to = point(edge.to);
      const highlighted = hovered === edge.from || hovered === edge.to;
      const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, capabilityColor(edge.from));
      gradient.addColorStop(1, capabilityColor(edge.to));
      context.strokeStyle = gradient;
      context.globalAlpha = highlighted ? 0.95 : 0.35;
      context.lineWidth = highlighted ? 2.2 : 1.2;
      context.beginPath();
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 18;
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(midX, midY, to.x, to.y);
      context.stroke();

      if (runtime.reducedMotion) continue;
      // A pulse travels the same curve: "work flows between these two capabilities".
      const progress = (elapsed * 0.22 + CAPABILITY_EDGES.indexOf(edge) * 0.17) % 1;
      const inv = 1 - progress;
      const px = inv * inv * from.x + 2 * inv * progress * midX + progress * progress * to.x;
      const py = inv * inv * from.y + 2 * inv * progress * midY + progress * progress * to.y;
      context.globalAlpha = highlighted ? 1 : 0.7;
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(px, py, highlighted ? 3.4 : 2.4, 0, Math.PI * 2);
      context.fill();
    }

    // Nodes.
    context.globalAlpha = 1;
    for (const node of CAPABILITY_NODES) {
      const { x, y } = point(node.capability);
      const color = capabilityColor(node.capability);
      const radius = hovered === node.capability ? 15 : 12;
      const glow = context.createRadialGradient(x, y, 2, x, y, radius * 3.2);
      glow.addColorStop(0, `${color}66`);
      glow.addColorStop(1, "transparent");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius * 3.2, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#06120c";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = hovered === node.capability ? 3 : 2;
      context.stroke();

      if (runtime.reducedMotion) continue;
      const blink = 0.55 + 0.45 * Math.sin(elapsed * 1.6 + radius);
      context.globalAlpha = blink;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, radius * 0.42, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  });

  return (
    <div className="relative h-full w-full" data-scene="HeroSystem" data-scene-frames={framesRef.current}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

      <ul className="absolute inset-0 m-0 list-none p-0" aria-label={lang === "fa" ? "پنج توان تیم و شاهد زنده هرکدام" : "The five team capabilities and their live proof"}>
        {CAPABILITY_NODES.map((node) => (
          <li
            key={node.capability}
            className="absolute"
            style={{ left: `${LAYOUT[node.capability].x}%`, top: `${LAYOUT[node.capability].y}%`, transform: "translate(-50%, -50%)" }}
          >
            <NodeLink node={node} lang={lang} onHover={setHovered} />
          </li>
        ))}
      </ul>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-[11px] text-white/60">
        {hovered ? edgeSummary(hovered, lang) : lang === "fa" ? "هر گره به artifact زندهٔ همان توان باز می‌شود." : "Every node opens the live artifact that proves that capability."}
      </div>
    </div>
  );
}

function NodeLink({ node, lang, onHover }: { node: CapabilityNode; lang: "fa" | "en"; onHover: (capability: Capability | null) => void }) {
  const path = evidencePathFor(node, lang);
  const entry = entryForCapability(node);
  const label = labelFor(node.capability, lang);
  return (
    <Link
      to={path ?? `/${lang}/tools`}
      onMouseEnter={() => onHover(node.capability)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.capability)}
      onBlur={() => onHover(null)}
      data-capability={node.capability}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--line)] bg-black/60 px-3 py-1 text-[11.5px] text-white/85 backdrop-blur transition-colors hover:border-[var(--bright)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)]"
      title={entry?.title[lang]}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: capabilityColor(node.capability) }} aria-hidden />
      {label}
    </Link>
  );
}

function edgeSummary(capability: Capability, lang: "fa" | "en"): string {
  const node = CAPABILITY_NODES.find((item) => item.capability === capability);
  const edges = CAPABILITY_EDGES.filter((edge) => edge.from === capability || edge.to === capability);
  const own = node?.edgeNote[lang] ?? "";
  const links = edges.map((edge) => edge.label[lang]).join(" · ");
  return links ? `${own} — ${links}` : own;
}
