import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  RULES_VERSION,
  buildDiff,
  diffPlainText,
  normalizePersian,
  parsePersianTextState,
  toPersianTextParams,
  type RuleId,
} from "./logic";

describe("F-04 acceptance", () => {
  /** Card test 1 — Arabic yeh/kaf and ZWNJ in one pass. */
  it("normalises «مي‌شود اين كتاب را دید» to standard Persian", () => {
    const result = normalizePersian("مي‌شود اين كتاب را دید");
    expect(result.normalized).toBe("می‌شود این کتاب را دید");
    expect(result.total).toBeGreaterThan(0);
    expect(result.changes.map((change) => change.rule)).toContain("yeh");
  });

  /** Card test 2 — Arabic-Indic digits become Persian digits. */
  it("converts Arabic-Indic digits", () => {
    const result = normalizePersian("٠١٢٣٤٥٦٧٨٩", ["digits"]);
    expect(result.normalized).toBe("۰۱۲۳۴۵۶۷۸۹");
  });

  /** Card test 3 (security) — markup must never leave the text layer. */
  it("keeps <script> as inert text and never produces markup", () => {
    const payload = '<script>alert(1)</script>';
    const result = normalizePersian(payload, DEFAULT_RULES);
    expect(result.normalized).toContain("<script>");
    const segments = buildDiff(payload, result.normalized);
    expect(diffPlainText(segments)).toContain("<script>");
    // The Tool component must render segments as text nodes, never as HTML.
    const source = readFileSync(new URL("./Tool.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  /** Card test 4 — 50k characters stay well under a second. */
  it("normalises 50,000 characters in under a second", () => {
    const sample = "مي‌شود اين كتاب را دید و نيم‌فاصله‌ي درست را ساخت. ";
    const text = sample.repeat(Math.ceil(50_000 / sample.length)).slice(0, 50_000);
    const started = performance.now();
    const result = normalizePersian(text);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(result.normalized.length).toBeGreaterThan(0);
  });

  /** Card test 5 — idempotency across 100 deterministic samples. */
  it("is idempotent across 100 samples", () => {
    const base = [
      "مي‌شود اين كتاب را دید",
      "کتاب‌هاي من و دوستهاي تو",
      "سلام   دنیا \"خوب\" است",
      "٠١٢٣٤٥ مصنوعي",
      "بزرگ‌ترين کتابها",
    ];
    for (let index = 0; index < 100; index += 1) {
      const sample = base[index % base.length] + " ".repeat(index % 3);
      const once = normalizePersian(sample).normalized;
      const twice = normalizePersian(once).normalized;
      expect(twice, sample).toBe(once);
    }
  });

  it("is conservative: exception words stay intact", () => {
    expect(normalizePersian("میز و میوه و میلیون", ["zwnj"]).normalized).toBe("میز و میوه و میلیون");
    expect(normalizePersian("دختر و دفتر من", ["zwnj"]).normalized).toBe("دختر و دفتر من");
    expect(normalizePersian("کتاب‌ها", ["zwnj"]).normalized).toBe("کتاب‌ها");
  });

  it("applies each rule independently", () => {
    const onlyDigits = normalizePersian("کتاب ۱۲۳", ["latin-digits"]);
    expect(onlyDigits.normalized).toBe("کتاب ۱۲۳");
    const latin = normalizePersian("کتاب 123", ["latin-digits"]);
    expect(latin.normalized).toBe("کتاب ۱۲۳");
    const kashida = normalizePersian("کــتاب", ["kashida"]);
    expect(kashida.normalized).toBe("کتاب");
    const diacritics = normalizePersian("مُعَلِّم", ["diacritics"]);
    expect(diacritics.normalized).toBe("معلم");
    expect(RULES_VERSION).toMatch(/^1404\./);
  });

  it("round-trips shareable state and never exceeds the URL budget", () => {
    const rules: RuleId[] = ["yeh", "zwnj"];
    const params = toPersianTextParams({ text: "مي‌شود", rules });
    expect(parsePersianTextState(params)).toEqual({ text: "مي‌شود", rules });
    const long = toPersianTextParams({ text: "x".repeat(1000), rules });
    expect((long.get("t") ?? "").length).toBeLessThan(500);
  });
});
