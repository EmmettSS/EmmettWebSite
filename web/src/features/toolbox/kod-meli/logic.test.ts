import { describe, expect, it } from "vitest";
import { accumulate, companyCheckDigit, emptyStats, normalizeId, personCheckDigit, validateNationalId } from "./logic";

/** Security guardrail: the module must never touch the network. */
describe("F-02 security: local checksum only", () => {
  it("never performs a network request, even when the input looks like a lookup", () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("F-02 must never call a third-party lookup service");
    }) as typeof fetch;
    try {
      expect(validateNationalId("2715830491").valid).toBe(true);
      expect(validateNationalId("۲۷۱۵۸۳۰۴۹۱").kind).toBe("person");
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

describe("F-02 acceptance", () => {
  /** Card test 1 — a structurally valid code with a complete step list. */
  it("validates a correct personal national ID and explains every step", () => {
    const result = validateNationalId("2715830491");
    expect(result.valid).toBe(true);
    expect(result.kind).toBe("person");
    expect(result.steps).toHaveLength(6);
    expect(result.expectedCheckDigit).toBe(1);
    expect(result.actualCheckDigit).toBe(1);
    expect(result.steps[2].detail).toContain("219");
  });

  /** Card test 2 — a wrong check digit points at the failing step. */
  it("rejects a wrong check digit with a specific Persian reason", () => {
    const result = validateNationalId("2715830492");
    expect(result.valid).toBe(false);
    expect(result.expectedCheckDigit).toBe(1);
    expect(result.actualCheckDigit).toBe(2);
    expect(result.reasonFa).toContain("رقم کنترل");
  });

  /** Card test 3 — an 11-digit legal entity ID uses the company algorithm. */
  it("validates an 11-digit legal entity id with the registry algorithm", () => {
    const nine = "1400123456";
    const check = companyCheckDigit(nine).checkDigit;
    const result = validateNationalId(`${nine}${check}`);
    expect(result.kind).toBe("company");
    expect(result.valid).toBe(true);
    expect(result.steps[2].detail).toContain("×11");
    expect(result.reasonFa).toContain("شناسهٔ ملی");
    const wrong = validateNationalId(`${nine}${(check + 1) % 10}`);
    expect(wrong.valid).toBe(false);
    expect(wrong.kind).toBe("company");
  });

  /** Card test 4 — Persian digits behave exactly like Latin digits. */
  it("treats Persian digits identically to Latin digits", () => {
    const persian = validateNationalId("۲۷۱۵۸۳۰۴۹۱");
    const latin = validateNationalId("2715830491");
    expect({ ...persian, input: "", normalized: "" }).toEqual({ ...latin, input: "", normalized: "" });
    expect(normalizeId("۲۷۱۵-۸۳۰ ۴۹۱")).toBe("2715830491");
    expect(normalizeId("٢٧١٥٨٣٠٤٩١")).toBe("2715830491");
  });

  it("covers the remainder < 2 branch", () => {
    const result = validateNationalId("0100000010");
    expect(result.valid).toBe(true);
    expect(result.expectedCheckDigit).toBe(0);
  });

  it("rejects repeated patterns that pass a naive checksum", () => {
    expect(personCheckDigit("111111111").checkDigit).toBe(1); // naive checksum would accept it
    expect(validateNationalId("1111111111").valid).toBe(false);
    expect(validateNationalId("00000000000").valid).toBe(false);
  });

  it("explains length and character failures in Persian", () => {
    expect(validateNationalId("123").reasonFa).toContain("۱۰ رقم");
    expect(validateNationalId("۱۲۳۴۵۶۷۸۹a").reasonFa).toContain("رقم");
    expect(validateNationalId("۱۲۳").reasonEn).toContain("10 digits");
  });

  it("keeps only aggregate counters — never the raw value", () => {
    let stats = emptyStats();
    stats = accumulate(stats, validateNationalId("2715830491"));
    stats = accumulate(stats, validateNationalId("7731689951"));
    stats = accumulate(stats, validateNationalId("14001234567"));
    expect(stats).toEqual({ total: 3, valid: 2, invalid: 1, person: 2, company: 1 });
    expect(JSON.stringify(stats)).not.toContain("2715");
  });
});
