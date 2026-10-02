/** F-08 client helpers — pure, testable, and the same rules the server enforces. */

export type Citation = { chunk_id: number | string | null; title: string; source: string; url: string };

export type RetrievalItem = Citation & { score: number; coverage?: number | null; excerpt: string };

export type AnswerMode = "llm" | "bm25" | "not_found";

export type AnswerPayload = {
  answer_id?: number;
  answer: string;
  citations: Citation[];
  retrieval: RetrievalItem[];
  mode: AnswerMode;
  provider: string;
  cached: boolean;
  disclosure: string;
  latency_ms: number;
};

export type ProgressStep = { step: string; state: string; mode?: string };

export const MAX_QUESTION_CHARS = 500;

/** The output filter, client side: an answer without a citation is never rendered. */
export function displayAnswer(payload: AnswerPayload): string {
  if (payload.mode === "not_found") return payload.answer;
  return payload.citations.length > 0 ? payload.answer : "";
}

export function hasVisibleAnswer(payload: AnswerPayload): boolean {
  return displayAnswer(payload).trim().length > 0;
}

export function modeLabel(mode: AnswerMode, lang: "fa" | "en"): string {
  const labels = {
    llm: { fa: "پاسخ هوشمند", en: "AI answer" },
    bm25: { fa: "جست‌وجوی متنی (BM25)", en: "Text search (BM25)" },
    not_found: { fa: "بدون پاسخ در کورپوس", en: "Not in the corpus" },
  } as const;
  return labels[mode][lang];
}

export function citationLabel(citation: Citation): string {
  if (citation.url) return citation.title || citation.url;
  return citation.source || citation.title;
}

export function citationHref(citation: Citation, lang: "fa" | "en"): string | null {
  if (!citation.url) return null;
  return citation.url.startsWith("/") ? `/${lang}${citation.url}` : citation.url;
}

export function countChars(value: string): number {
  return Array.from(value ?? "").length;
}

export function isWithinLimit(value: string, limit = MAX_QUESTION_CHARS): boolean {
  return countChars(value.trim()) > 0 && countChars(value) <= limit;
}

export function mergeProgress(previous: ProgressStep[], incoming: ProgressStep[]): ProgressStep[] {
  const seen = new Set(previous.map((step) => `${step.step}:${step.state}`));
  const merged = [...previous];
  for (const step of incoming) {
    const key = `${step.step}:${step.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(step);
  }
  return merged;
}

/** Only the top retrieval hits are worth showing in "show your work". */
export function workItems(payload: AnswerPayload, limit = 4): RetrievalItem[] {
  return [...payload.retrieval].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}

export function confidenceTone(score: number): "high" | "medium" | "low" {
  if (score >= 8) return "high";
  if (score >= 3) return "medium";
  return "low";
}
