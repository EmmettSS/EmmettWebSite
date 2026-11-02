import { afterEach, describe, expect, it, vi } from "vitest";

import { prefersReducedMotion } from "./reduced-motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false when the user has not asked to reduce motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
    }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is true when prefers-reduced-motion is reduce", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
    }));
    expect(prefersReducedMotion()).toBe(true);
  });
});
