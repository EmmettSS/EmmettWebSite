/** F-13 acceptance: deep link encoding, per-source pre-fill, language, and honest states. */
import { describe, expect, it } from "vitest";
import { buildTelegramLink, isConfiguredHandle } from "./link";

describe("F-13 · telegram deep links", () => {
  it("encodes the pre-filled message and keeps the source-specific text", () => {
    const link = buildTelegramLink("@emmett", "scanner", "fa", "https://emmett.ir");
    expect(link.startsWith("https://t.me/emmett?text=")).toBe(true);
    const text = decodeURIComponent(link.split("?text=")[1]);
    expect(text).toContain("چک‌آپ امنیتی دامنه");
    expect(text).toContain("utm_source=telegram");
    expect(text).toContain("utm_campaign=f13-scanner");
    expect(text).toContain("/fa/scanner/");
  });

  it("uses English copy and locale path on the en site", () => {
    const link = buildTelegramLink("emmett", "biolab", "en", "https://emmett.ir");
    const text = decodeURIComponent(link.split("?text=")[1]);
    expect(text).toContain("bioinformatics workbench");
    expect(text).toContain("/en/biolab/");
    expect(link).not.toContain("@emmett"); // leading @ stripped
  });

  it("treats placeholder and empty handles as not configured", () => {
    expect(isConfiguredHandle("[INPUT B5]")).toBe(false);
    expect(isConfiguredHandle("")).toBe(false);
    expect(isConfiguredHandle(null)).toBe(false);
    expect(isConfiguredHandle("@emmett")).toBe(true);
    expect(isConfiguredHandle("emmett_lab")).toBe(true);
  });

  it("never emits a link for a placeholder handle", () => {
    expect(isConfiguredHandle("[INPUT B5]")).toBe(false);
    const link = buildTelegramLink("emmett", "home", "fa");
    expect(() => new URL(link)).not.toThrow();
    expect(link).toContain("t.me/emmett");
  });
});
