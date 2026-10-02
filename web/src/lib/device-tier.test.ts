import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTier } from "./device-tier";
function setDevice(cores: number, memory: number, reduced = false) {
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: cores });
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: memory });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }), localStorage: { getItem: vi.fn(), setItem: vi.fn() } });
}
afterEach(() => vi.unstubAllGlobals());
describe("detectTier", () => {
  it("selects each performance tier from device capability", () => {
    setDevice(8, 8); expect(detectTier()).toBe("full");
    setDevice(4, 4); expect(detectTier()).toBe("balanced");
    setDevice(2, 2); expect(detectTier()).toBe("low-power");
  });
  it("honors reduced motion as low-power", () => { setDevice(16, 16, true); expect(detectTier()).toBe("low-power"); });
});
