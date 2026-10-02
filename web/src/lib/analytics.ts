/** Matomo-compatible goal ping. No dependency: if the tag is absent, nothing happens. */
declare global {
  interface Window {
    _paq?: Array<unknown[]>;
  }
}

/**
 * Named event with a value, used by the Phase-5 event list (`scan_run`, `palette_open`, …).
 * Same contract as `trackGoal`: silent no-op without a Matomo tag.
 */
export function trackEvent(name: string, value?: string) {
  trackGoal(name, value);
}

export function trackGoal(name: string, value?: string) {
  if (typeof window === "undefined") return;
  try {
    window._paq = window._paq ?? [];
    window._paq.push(["trackEvent", "feature", name, value ?? "default"]);
  } catch {
    /* analytics must never break the product */
  }
}
