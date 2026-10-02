import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTier } from "@/lib/device-tier";
import { addWorkingDays, convertJalali } from "./jalali/logic";
import { validateNationalId } from "./kod-meli/logic";
import { formatTomanFa, parseAmount } from "./toman/logic";
import { buildDiff, normalizePersian } from "./matn-farsi/logic";
import { decodeJwt } from "./jwt/logic";

function setLowPowerDevice() {
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 2 });
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 2 });
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    localStorage: { getItem: vi.fn(), setItem: vi.fn() },
  });
}

afterEach(() => vi.unstubAllGlobals());

/**
 * Exit gate §8: with `hardwareConcurrency = 2` every one of the five tools must still work
 * end to end. Only effects are dropped in low-power mode, never functionality (G2).
 */
describe("low-power tier keeps all five tools fully functional", () => {
  it("detects the tier from the mocked hardware", () => {
    setLowPowerDevice();
    expect(detectTier()).toBe("low-power");
  });

  it("F-01 converts and plans business days", () => {
    setLowPowerDevice();
    const conversion = convertJalali("1403/12/30");
    expect(conversion.ok && conversion.gregorian.month === 3 && conversion.gregorian.day === 20).toBe(true);
    const plan = addWorkingDays({ year: 1404, month: 1, day: 1 }, 1, {});
    expect(plan.result).toEqual({ year: 1404, month: 1, day: 2 });
  });

  it("F-02 validates the national ID", () => {
    setLowPowerDevice();
    const result = validateNationalId("2715830491");
    expect(result.valid).toBe(true);
    expect(result.steps.length).toBeGreaterThan(2);
  });

  it("F-03 formats and spells out an amount", () => {
    setLowPowerDevice();
    const parsed = parseAmount("۱٬۲۵۰٬۰۰۰");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(formatTomanFa(parsed.toman)).toContain("۱٬۲۵۰٬۰۰۰");
  });

  it("F-04 normalises and diffs text", () => {
    setLowPowerDevice();
    const result = normalizePersian("مي شود");
    expect(result.normalized).toContain("می");
    expect(buildDiff("مي شود", result.normalized).some((segment) => segment.changed)).toBe(true);
  });

  it("F-05 decodes a token and surfaces warnings", () => {
    setLowPowerDevice();
    const result = decodeJwt("eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.some((warning) => warning.id === "alg-none")).toBe(true);
  });
});
