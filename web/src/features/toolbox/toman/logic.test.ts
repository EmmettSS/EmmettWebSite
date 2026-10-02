import { describe, expect, it } from "vitest";
import {
  MAX_TOMAN,
  formatRialFa,
  formatTomanFa,
  formalInvoiceLine,
  groupLatin,
  invoiceBreakdown,
  parseAmount,
  rialToToman,
  tomanShareParams,
  tomanToRial,
  tomanToWords,
  tomanToWordsPlain,
  wordsToToman,
  parseTomanState,
} from "./logic";

describe("F-03 acceptance", () => {
  /** Card test 1 — the canonical example from the feature card. */
  it("formats 1,250,000 toman in digits and words", () => {
    expect(formatTomanFa(1250000n)).toBe("۱٬۲۵۰٬۰۰۰ تومان");
    expect(tomanToWords(1250000n)).toBe("یک میلیون و دویست و پنجاه هزار تومان");
    expect(tomanToRial(1250000n)).toBe(12500000n);
    expect(formatRialFa(1250000n)).toBe("۱۲٬۵۰۰٬۰۰۰ ریال");
  });

  /** Card test 2 — zero is a word, not an empty string. */
  it("spells zero as «صفر تومان»", () => {
    expect(tomanToWords(0n)).toBe("صفر تومان");
    expect(tomanToWordsPlain(0n)).toBe("صفر");
    expect(formatTomanFa(0n)).toBe("۰ تومان");
  });

  /** Card test 3 — trillions must be spelled correctly. */
  it("spells a trillion toman", () => {
    expect(tomanToWords(1_000_000_000_000n)).toBe("یک تریلیون تومان");
    expect(tomanToWords(1_200_500_000_000n)).toBe("یک تریلیون و دویست میلیارد و پانصد میلیون تومان");
  });

  /** Card test 4 — decimals are rejected with a documented Persian message. */
  it("rejects decimal input instead of crashing or silently rounding", () => {
    const result = parseAmount("1250000.5");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("decimal");
    expect(result.messageFa).toContain("اعشاری");
  });

  /** Card test 5 — property-based round trip over 1000 deterministic values. */
  it("round-trips 1000 deterministic integers through words", () => {
    let seed = 987654321;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return BigInt(seed % 1_000_000_000_000);
    };
    for (let index = 0; index < 1000; index += 1) {
      const value = next();
      expect(wordsToToman(tomanToWords(value)), `${value}`).toBe(value);
    }
  });

  it("never uses floats: the maximum amount survives intact", () => {
    expect(parseAmount(MAX_TOMAN.toString())).toEqual({ ok: true, toman: MAX_TOMAN });
    const tooLarge = parseAmount((MAX_TOMAN + 1n).toString());
    expect(tooLarge.ok).toBe(false);
    if (tooLarge.ok) return;
    expect(tooLarge.code).toBe("too-large");
    expect(Number.isSafeInteger(Number(tomanToRial(MAX_TOMAN)))).toBe(false); // proves a float would lose precision
  });

  it("accepts separators, currency words and Persian digits", () => {
    expect(parseAmount("۱٬۲۵۰٬۰۰۰ تومان")).toEqual({ ok: true, toman: 1250000n });
    expect(parseAmount("1,250,000 ریال")).toEqual({ ok: true, toman: 1250000n });
    expect(parseAmount("")).toMatchObject({ ok: false, code: "empty" });
    expect(parseAmount("-500")).toMatchObject({ ok: false, code: "negative" });
  });

  it("builds the formal invoice line and integer-only VAT math", () => {
    expect(formalInvoiceLine(1250000n)).toBe("مبلغ ۱٬۲۵۰٬۰۰۰ تومان (یک میلیون و دویست و پنجاه هزار تومان)");
    const invoice = invoiceBreakdown(1_000_000n, 100_000n, 10);
    expect(invoice).toMatchObject({ subtotal: 1_000_000n, discount: 100_000n, taxable: 900_000n, vat: 90_000n, total: 990_000n });
    // Half-up rounding on an odd taxable amount.
    expect(invoiceBreakdown(1_005n, 0n, 10).vat).toBe(101n);
    expect(() => invoiceBreakdown(100n, 200n, 10)).toThrow(/تخفیف/);
    expect(() => invoiceBreakdown(100n, 0n, 7.5)).toThrow(/نرخ/);
  });

  it("handles Rial → Toman with an explicit rounding flag", () => {
    expect(rialToToman(12_500_000n)).toEqual({ toman: 1_250_000n, rounded: false });
    expect(rialToToman(1_250_005n)).toEqual({ toman: 125_000n, rounded: true });
    expect(groupLatin(123456789n)).toBe("123٬456٬789");
  });

  it("round-trips its shareable URL state", () => {
    const state = { amount: "1250000", vat: "10", discount: "0", digits: "fa" as const };
    expect(parseTomanState(tomanShareParams(state))).toEqual(state);
  });
});
