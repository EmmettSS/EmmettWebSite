/**
 * Phase-5 analytics event contract.
 *
 * Every event in `prompts/07-PHASE-5-LAUNCH.md` §5 is declared here once, with its payload, so
 * the target metrics in MASTER §1 stay computable from a single list. The transport is a silent
 * no-op unless a Matomo URL is configured (`src/lib/matomo.ts`), so events can be wired today
 * and start reporting the moment analytics is switched on — no code change needed.
 */
import { trackGoal } from "./analytics";

export type EventName =
  | "tool_use"
  | "tool_share"
  | "palette_open"
  | "terminal_command"
  | "scan_run"
  | "scan_share"
  | "pentestor_cta"
  | "assistant_ask"
  | "assistant_fallback"
  | "bio_analyze"
  | "contact_submit"
  | "telegram_click"
  | "capability_click";

export type EventPayload = {
  tool_use: { tool: string; completed: boolean };
  tool_share: { tool: string; method: "link" | "copy" | "download" };
  palette_open: { trigger: "keyboard" | "button" | "terminal" };
  terminal_command: { command: string };
  scan_run: { result_grade: string };
  scan_share: { method: "link" | "copy" };
  pentestor_cta: { source: string };
  assistant_ask: { had_citation: boolean };
  assistant_fallback: { reason: "provider_down" | "budget" | "low_similarity" | "offline" | "empty" };
  bio_analyze: { length_bucket: "tiny" | "small" | "medium" | "large" };
  contact_submit: { source: string };
  telegram_click: { source: string };
  capability_click: { capability: string };
};

/** Buckets keep sequence lengths out of analytics: only coarse sizes are ever reported. */
export function lengthBucket(length: number): EventPayload["bio_analyze"]["length_bucket"] {
  if (length < 1_000) return "tiny";
  if (length < 10_000) return "small";
  if (length < 100_000) return "medium";
  return "large";
}

export function emit<K extends EventName>(name: K, payload: EventPayload[K]): void {
  const value = Object.entries(payload as Record<string, unknown>)
    .map(([key, item]) => `${key}=${String(item)}`)
    .join("|");
  trackGoal(name, value);
}

export const EVENT_CATALOG: EventName[] = [
  "tool_use",
  "tool_share",
  "palette_open",
  "terminal_command",
  "scan_run",
  "scan_share",
  "pentestor_cta",
  "assistant_ask",
  "assistant_fallback",
  "bio_analyze",
  "contact_submit",
  "telegram_click",
  "capability_click",
];
