import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError, apiPost } from "@/lib/api-client";
import type { SharePayload } from "./types";

/** Keeps tool state in the URL so every result is bookmarkable and shareable (card rule 3). */
export function useUrlState<T>(parse: (params: URLSearchParams) => T, serialize: (state: T) => URLSearchParams): [T, (next: T, options?: { replace?: boolean }) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => parse(new URLSearchParams(location.search)), [location.search, parse]);
  const update = useCallback(
    (next: T, options: { replace?: boolean } = {}) => {
      const params = serialize(next).toString();
      navigate({ pathname: location.pathname, search: params ? `?${params}` : "" }, { replace: options.replace ?? true });
    },
    [location.pathname, navigate, serialize],
  );
  return [state, update];
}

export type ShareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; path: string }
  | { status: "unavailable"; reason: string };

/**
 * Creates a permanent, noindex share link on the server.
 * Degrades honestly: the tool keeps working and the UI says why sharing is unavailable.
 */
export function useShareLink(tool: string) {
  const [state, setState] = useState<ShareState>({ status: "idle" });
  const create = useCallback(
    async (payload: SharePayload, locale: "fa" | "en") => {
      setState({ status: "loading" });
      try {
        const response = await apiPost<{ path: string }>("/tools/share/", {
          tool,
          locale,
          summary_fa: payload.summaryFa,
          summary_en: payload.summaryEn,
          params: payload.params,
        });
        setState({ status: "ready", path: response.path });
      } catch (error) {
        const message = error instanceof ApiError ? (locale === "fa" ? error.messageFa : error.messageEn) : String(error);
        setState({ status: "unavailable", reason: message });
      }
    },
    [tool],
  );
  const reset = useCallback(() => setState({ status: "idle" }), []);
  return { state, create, reset };
}

const USAGE_ENDPOINT = "/tools/usage/";
const USAGE_KEY = "emmett:tool-usage-sent";

/** Aggregate usage ping: tool id, locale, completion flag. Never the user's input. */
export function trackToolUse(tool: string, locale: "fa" | "en", completed: boolean) {
  if (typeof window === "undefined") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const seen = JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? "{}") as Record<string, string>;
    if (seen[`${tool}:${completed}`] === today) return;
    seen[`${tool}:${completed}`] = today;
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(seen));
  } catch {
    /* localStorage can be unavailable; usage tracking is best-effort by design */
  }
  void apiPost(USAGE_ENDPOINT, { tool, locale, completed }).catch(() => undefined);
}

/** Copies text with a graceful fallback for older browsers. */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(async (text: string, key = "value") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);
  }, []);
  return { copied, copy };
}

/** Debounces a value (used for the live conversion as the visitor types). */
export function useDebounced<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
