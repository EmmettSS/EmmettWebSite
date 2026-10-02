import { useEffect, useState } from "react";

export type Tier = "full" | "balanced" | "low-power";
type Override = "auto" | "low-power";
const STORAGE_KEY = "emmett:low-power";

export function detectTier(): Tier {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "balanced";
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduced) return "low-power";
  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 2;
  if (cores >= 8 && memory >= 8) return "full";
  if (cores >= 4 && memory >= 4) return "balanced";
  return "low-power";
}

/** The raw signals behind `detectTier()` — F-10 shows the visitor *why* their tier was chosen. */
export type TierDiagnostics = {
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  reducedMotion: boolean;
  override: "auto" | "low-power";
  tier: Tier;
};

export function describeTier(tier: Tier, override: "auto" | "low-power" = "auto"): TierDiagnostics {
  if (typeof navigator === "undefined") {
    return { hardwareConcurrency: null, deviceMemory: null, reducedMotion: false, override, tier };
  }
  return {
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    override,
    tier,
  };
}

export function useTier() {
  // Start deterministically to avoid server/client hydration differences.
  const [tier, setTier] = useState<Tier>("balanced");
  const [override, setOverrideState] = useState<Override>("auto");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    let mode: Override = stored === "true" ? "low-power" : "auto";
    setOverrideState(mode);
    setTier(mode === "low-power" ? "low-power" : detectTier());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTier((current) => current === "low-power" && mode === "low-power" ? "low-power" : detectTier());
    const overrideUpdate = (event: Event) => {
      const next = (event as CustomEvent<Override>).detail;
      mode = next;
      setOverrideState(next);
      setTier(next === "low-power" ? "low-power" : detectTier());
    };
    const storageUpdate = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const next: Override = event.newValue === "true" ? "low-power" : "auto";
        mode = next;
        setOverrideState(next);
        setTier(next === "low-power" ? "low-power" : detectTier());
      }
    };
    query.addEventListener?.("change", update);
    window.addEventListener("emmett:tier-change", overrideUpdate);
    window.addEventListener("storage", storageUpdate);
    return () => {
      query.removeEventListener?.("change", update);
      window.removeEventListener("emmett:tier-change", overrideUpdate);
      window.removeEventListener("storage", storageUpdate);
    };
  }, []);
  const setOverride = (value: Override) => {
    setOverrideState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value === "low-power"));
    setTier(value === "low-power" ? "low-power" : detectTier());
    window.dispatchEvent(new CustomEvent<Override>("emmett:tier-change", { detail: value }));
  };
  return { tier, override, setOverride };
}

export function TierGate({ full, balanced, lowPower }: { full?: React.ReactNode; balanced?: React.ReactNode; lowPower?: React.ReactNode }) {
  const { tier } = useTier();
  return <>{tier === "full" ? full : tier === "balanced" ? (balanced ?? lowPower) : lowPower}</>;
}

export function TierFallback({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { tier } = useTier();
  return <>{tier === "low-power" ? fallback : children}</>;
}
