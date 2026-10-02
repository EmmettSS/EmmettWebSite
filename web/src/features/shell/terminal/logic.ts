import type { CommandResponse } from "./commands";

export type HistoryEntry = { command: string; response: CommandResponse };

/** Keeps a bounded command history (used by the ↑/↓ navigation). */
export function pushHistory(history: HistoryEntry[], entry: HistoryEntry, limit = 80): HistoryEntry[] {
  const next = [...history, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/** Reads the `?cmd=` deep link used by the palette (“open terminal with a command”). */
export function commandFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return params.get("cmd") ?? "";
}

export type TerminalKey = "Enter" | "Tab" | "ArrowUp" | "ArrowDown" | "Escape" | "other";

export function classifyKey(key: string): TerminalKey {
  if (key === "Enter" || key === "Tab" || key === "ArrowUp" || key === "ArrowDown" || key === "Escape") return key;
  return "other";
}
