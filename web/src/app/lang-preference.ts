/**
 * Entry-language rules (MASTER §10): Persian is the default and `/` sends first-time
 * visitors to `/fa`. A visitor who deliberately switched to English keeps that choice.
 */
export type EntryLang = "en" | "fa";

const STORAGE_KEY = "emmett-language";

export function defaultLangTarget(stored: string | null = null): EntryLang {
  return stored === "en" ? "en" : "fa";
}

export function readStoredLang(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null; // private mode / storage disabled → fall back to the default
  }
}
