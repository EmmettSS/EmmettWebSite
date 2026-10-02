import { describe, expect, it } from "vitest";
import {
  citationHref,
  citationLabel,
  confidenceTone,
  countChars,
  displayAnswer,
  hasVisibleAnswer,
  isWithinLimit,
  mergeProgress,
  modeLabel,
  workItems,
  type AnswerPayload,
} from "./logic";

const base: AnswerPayload = {
  answer: "پاسخ آزمایشی",
  citations: [{ chunk_id: 1, title: "FAQ", source: "faq/stack.fa", url: "/about" }],
  retrieval: [
    { chunk_id: 1, title: "FAQ", source: "faq/stack.fa", url: "/about", score: 9.1, excerpt: "…" },
    { chunk_id: 2, title: "b", source: "s2", url: "", score: 2.2, excerpt: "…" },
  ],
  mode: "bm25",
  provider: "bm25",
  cached: false,
  disclosure: "…",
  latency_ms: 40,
};

describe("assistant client logic", () => {
  it("never renders an answer that has no citation (output filter)", () => {
    expect(displayAnswer(base)).toContain("پاسخ آزمایشی");
    expect(displayAnswer({ ...base, citations: [] })).toBe("");
    expect(hasVisibleAnswer({ ...base, citations: [] })).toBe(false);
  });

  it("always renders the honest not-found answer", () => {
    const notFound: AnswerPayload = { ...base, citations: [], mode: "not_found", answer: "این را در مطالب ما پیدا نکردم." };
    expect(displayAnswer(notFound)).toBe(notFound.answer);
    expect(hasVisibleAnswer(notFound)).toBe(true);
  });

  it("enforces the 500-character limit", () => {
    expect(countChars("سلام")).toBe(4);
    expect(isWithinLimit("س".repeat(500))).toBe(true);
    expect(isWithinLimit("س".repeat(501))).toBe(false);
    expect(isWithinLimit("   ")).toBe(false);
  });

  it("labels modes bilingually", () => {
    expect(modeLabel("llm", "fa")).toContain("هوشمند");
    expect(modeLabel("bm25", "en")).toContain("BM25");
    expect(modeLabel("not_found", "fa")).toContain("کورپوس");
  });

  it("builds locale-aware citation links and labels", () => {
    expect(citationHref(base.citations[0], "fa")).toBe("/fa/about");
    expect(citationHref({ ...base.citations[0], url: "" }, "fa")).toBeNull();
    expect(citationLabel({ chunk_id: 3, title: "", source: "docs/SECURITY.md", url: "" })).toBe("docs/SECURITY.md");
  });

  it("deduplicates polling progress", () => {
    const first = mergeProgress([], [{ step: "retrieval", state: "running" }]);
    const second = mergeProgress(first, [
      { step: "retrieval", state: "running" },
      { step: "answer", state: "done" },
    ]);
    expect(second).toHaveLength(2);
  });

  it("shows only the strongest retrieval hits in the work panel", () => {
    expect(workItems(base).map((item) => item.chunk_id)).toEqual([1, 2]);
    expect(confidenceTone(9)).toBe("high");
    expect(confidenceTone(4)).toBe("medium");
    expect(confidenceTone(1)).toBe("low");
  });
});
