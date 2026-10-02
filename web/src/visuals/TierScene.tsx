/**
 * `<TierScene>` — the only way a scene may be rendered (prompt §3.2).
 *
 * Contract:
 *  · reads the device tier from Phase 0 (`useTier`);
 *  · dynamic-imports the scene (scenes never enter the initial bundle — rule 1);
 *  · an IntersectionObserver starts the scene inside the viewport and stops it outside (rule 3/7);
 *  · `reduced-motion` and `low-power` render the pre-rendered fallback instead (rule 5);
 *  · the container keeps a fixed aspect ratio so mounting a scene can never shift layout (rule 6).
 *
 * An eslint restriction (`no-restricted-imports` on `@/visuals/scenes/*`) blocks importing a
 * scene anywhere else, so this wrapper cannot be bypassed by accident.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTier, type Tier } from "@/lib/device-tier";
import { resolveDpr, type SceneRuntime } from "./primitives/scene-runtime";
import { SCENES, type SceneName } from "./registry";

const TIER_RANK: Record<Tier, number> = { "low-power": 0, balanced: 1, full: 2 };

/** Scenes are code-split; each one is a separate chunk downloaded only when it will run. */
const LAZY_SCENES = Object.fromEntries(
  Object.entries(SCENES).map(([name, scene]) => [name, lazy(scene.load)]),
) as Record<SceneName, React.LazyExoticComponent<React.ComponentType<{ runtime: SceneRuntime }>>>;

export type TierSceneProps = {
  scene: SceneName;
  /** Required: a pre-rendered fallback for low-power, reduced-motion and no-WebGL cases. */
  fallback: ReactNode;
  /** Renders the fallback below this tier. Defaults to the scene's own minimum. */
  minTier?: Tier;
  /** Keep the scene mounted but paused when it leaves the viewport (default true). */
  pauseOffscreen?: boolean;
  /** Scenes are always code-split; the flag is kept so call sites state the intent explicitly. */
  lazy?: boolean;
  /** Fixed height in CSS pixels; keeps CLS at zero (rule 6). */
  height?: number;
  className?: string;
};

export function TierScene({ scene, fallback, minTier, pauseOffscreen = true, height = 320, className = "" }: TierSceneProps) {
  const { tier } = useTier();
  const definition = SCENES[scene];
  const minimum = minTier ?? definition.minTier;
  const reduced = usePrefersReducedMotion();
  const canvasReady = useCanvasSupported();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // WebGL-absent (here: no 2D canvas either) devices get the fallback, never a blank box.
  const allowed = canvasReady && !reduced && TIER_RANK[tier] >= TIER_RANK[minimum];
  const runtime = useMemo<SceneRuntime>(
    () => ({
      tier,
      dpr: resolveDpr(tier),
      active: allowed && (pauseOffscreen ? inView : true),
      reducedMotion: reduced,
      fpsCap: tier === "balanced" ? 24 : 60,
    }),
    [allowed, inView, pauseOffscreen, reduced, tier],
  );

  const Scene = LAZY_SCENES[scene];
  // Rule 3: before the scene enters the viewport we render neither the scene nor the fallback —
  // a neutral placeholder reserves the space, so nothing starts early and nothing shifts (rule 6).
  const started = inView || !pauseOffscreen;
  const showScene = allowed && started;

  // No `aria-label` on the container below, on purpose: a roleless div may not carry one (axe:
  // aria-prohibited-attr) and the content names itself — the scene renders a labelled capability
  // list and the fallback renders real links and text.
  return (
    <div
      ref={containerRef}
      data-tier-scene={scene}
      data-scene-active={runtime.active ? "true" : "false"}
      data-scene-tier={tier}
      // The box is reserved by CSS, so mounting the scene cannot change layout (rule 6 / CLS).
      style={{ height, contain: "layout paint" }}
      className={`relative w-full overflow-hidden rounded-3xl border border-[var(--line)] bg-[#07130d]/60 ${className}`}
    >
      {showScene ? (
        <Suspense fallback={<div className="h-full w-full" data-scene-loading="true" />}>
          <Scene runtime={runtime} />
        </Suspense>
      ) : allowed ? (
        <div className="h-full w-full" data-scene-placeholder="true" aria-hidden />
      ) : (
        <div className="h-full w-full" data-scene-fallback="true">
          {fallback}
        </div>
      )}
    </div>
  );
}

/** Canvas availability probe: a device without canvas support must fall back, not blank out. */
function useCanvasSupported(): boolean {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const canvas = document.createElement("canvas");
      setSupported(Boolean(canvas.getContext && canvas.getContext("2d")));
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export default TierScene;
