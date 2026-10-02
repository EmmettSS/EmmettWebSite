// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { defaultLangTarget, readStoredLang } from "./lang-preference";

describe("entry language (MASTER §10: Persian is the default)", () => {
  it("sends a first-time visitor to Persian", () => {
    expect(defaultLangTarget(null)).toBe("fa");
    expect(defaultLangTarget("fa")).toBe("fa");
    expect(defaultLangTarget("fr")).toBe("fa");
  });

  it("honours an explicit English choice", () => {
    expect(defaultLangTarget("en")).toBe("en");
  });

  it("survives storage being unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(readStoredLang()).toBeNull();
    if (original) Object.defineProperty(window, "localStorage", original);
  });
});
