// @vitest-environment jsdom
/**
 * Phase-5 §5 event contract: every named event exists, carries the documented payload, and the
 * Matomo loader stays inert until a URL is configured (no third-party code, no cookies).
 */
import { describe, expect, it, vi } from "vitest";
import { EVENT_CATALOG, emit, lengthBucket } from "./events";
import { isAllowedMatomoUrl, isMatomoConfigured } from "./matomo";

describe("event catalog", () => {
  it("implements every event named in the launch prompt", () => {
    const required = [
      "tool_use",
      "tool_share",
      "palette_open",
      "terminal_command",
      "scan_run",
      "scan_share",
      "pentestor_cta",
      "assistant_ask",
      "assistant_fallback",
      "bio_analyze",
      "contact_submit",
      "telegram_click",
      "capability_click",
    ];
    expect([...EVENT_CATALOG].sort()).toEqual([...required].sort());
  });

  it("queues an event for Matomo without needing the tag to be loaded", () => {
    window._paq = [];
    emit("bio_analyze", { length_bucket: "small" });
    expect(window._paq?.at(-1)).toEqual(["trackEvent", "feature", "bio_analyze", "length_bucket=small"]);
  });

  it("never sends a raw sequence length, only the coarse bucket", () => {
    expect(lengthBucket(999)).toBe("tiny");
    expect(lengthBucket(1_000)).toBe("small");
    expect(lengthBucket(9_999)).toBe("small");
    expect(lengthBucket(10_000)).toBe("medium");
    expect(lengthBucket(1_000_000)).toBe("large");
  });
});

describe("matomo loader guardrails", () => {
  it("is inert when no URL is configured", () => {
    expect(isMatomoConfigured()).toBe(false);
  });

  it("accepts same-origin and the project domain, rejects everything else", () => {
    expect(isAllowedMatomoUrl("/matomo", "https://emmett.ir")).toBe(true);
    expect(isAllowedMatomoUrl("https://emmett.ir/matomo", "https://emmett.ir")).toBe(true);
    expect(isAllowedMatomoUrl("https://analytics.emmett.ir", "https://emmett.ir")).toBe(true);
    expect(isAllowedMatomoUrl("https://doubleclick.net/tracker.js", "https://emmett.ir")).toBe(false);
    expect(isAllowedMatomoUrl("http://plain-http.example.com", "https://emmett.ir")).toBe(false);
    expect(isAllowedMatomoUrl("javascript:alert(1)", "https://emmett.ir")).toBe(false);
    expect(isAllowedMatomoUrl("https://tracker.example.com:8443", "https://emmett.ir")).toBe(false);
  });
});

describe("emit transport", () => {
  it("is a silent no-op when window is unavailable (SSR/build scripts)", () => {
    const original = globalThis.window;
    // @ts-expect-error deliberately removing the browser global for the assertion
    delete globalThis.window;
    expect(() => emit("palette_open", { trigger: "keyboard" })).not.toThrow();
    globalThis.window = original;
    vi.unstubAllGlobals();
  });
});
