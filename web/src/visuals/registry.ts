/**
 * Scene registry — the single list of scenes and their fallbacks.
 *
 * Rules 2 and 3 of §3.3 are enforced here:
 *  · every scene declares the pre-rendered fallback that ships in `visuals/fallbacks/`
 *    (the test checks the file exists, and the OG/fallback script re-renders the asset);
 *  · every scene is a dynamic import, so nothing visual lands in the initial bundle.
 */
import type { ComponentType } from "react";
import type { Tier } from "@/lib/device-tier";
import { DataLatticeStatic } from "./fallbacks/DataLatticeStatic";
import { HeroSystemStatic } from "./fallbacks/HeroSystemStatic";
import { SignalFlowStatic } from "./fallbacks/SignalFlowStatic";

export type SceneDefinition = {
  /** Minimum tier required to run the live scene. */
  minTier: Tier;
  /** Pre-rendered fallback basename inside `src/visuals/fallbacks/`. */
  fallbackFile: string;
  load: () => Promise<{ default: React.ComponentType<{ runtime: import("./primitives/scene-runtime").SceneRuntime }> }>;
};

export const SCENES = {
  HeroSystem: {
    minTier: "balanced",
    fallbackFile: "hero-system.svg",
    load: () => import("./scenes/HeroSystem"),
  },
  SignalFlow: {
    minTier: "balanced",
    fallbackFile: "signal-flow.svg",
    load: () => import("./scenes/SignalFlow"),
  },
  DataLattice: {
    minTier: "balanced",
    fallbackFile: "data-lattice.svg",
    load: () => import("./scenes/DataLattice"),
  },
} as const satisfies Record<string, SceneDefinition>;

export type SceneName = keyof typeof SCENES;

/**
 * The pre-rendered fallback component for each scene. Kept here (instead of at call sites only)
 * so the registry can prove every scene has one, and so a call site can never forget one.
 */
export const SCENE_FALLBACKS: Record<SceneName, ComponentType> = {
  HeroSystem: HeroSystemStatic,
  SignalFlow: SignalFlowStatic,
  DataLattice: DataLatticeStatic,
};
export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];
