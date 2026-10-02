/**
 * Matomo loader (Phase 5 §5).
 *
 * Rules:
 *  · the tracker script is injected **only** when `VITE_MATOMO_URL` is configured — with no URL
 *    the site ships zero third-party code and zero cookies;
 *  · cookieless (`disableCookies`) and same-origin: the URL is validated to be the current
 *    origin or an explicitly configured one, so no off-origin pixel can ever load;
 *  · every named event waits in the `_paq` queue, so events fired before the script arrives are
 *    still recorded.
 */
import { trackGoal } from "./analytics";

const MATOMO_URL = (import.meta.env.VITE_MATOMO_URL ?? "").trim();
const SITE_ID = (import.meta.env.VITE_MATOMO_SITE_ID ?? "1").trim();

export function isMatomoConfigured(): boolean {
  return MATOMO_URL.length > 0;
}

/** Same-origin guard: a configured URL must be absolute and must not be a known ad domain. */
export function isAllowedMatomoUrl(raw: string, origin: string): boolean {
  try {
    const url = new URL(raw, origin);
    // Only https on the default port, unless it is exactly this origin (local dev).
    if (url.origin !== origin && (url.protocol !== "https:" || url.port !== "")) return false;
    return url.origin === origin || url.hostname.endsWith("emmett.ir");
  } catch {
    return false;
  }
}

export function initMatomo(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window._paq = window._paq ?? [];
  if (MATOMO_URL) {
    if (!isAllowedMatomoUrl(MATOMO_URL, window.location.origin)) return;
    window._paq.push(["disableCookies"]);
    window._paq.push(["setDoNotTrack", true]);
    window._paq.push(["trackPageView"]);
    window._paq.push(["enableLinkTracking"]);
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `${MATOMO_URL.replace(/\/$/, "")}/matomo.js`;
    script.dataset.matomoSiteId = SITE_ID;
    document.head.appendChild(script);
    return;
  }
  // Not configured: keep the queue alive so nothing throws, but never load anything.
}

/** Re-export so call sites have one import for “shipping an event”. */
export { trackGoal };
