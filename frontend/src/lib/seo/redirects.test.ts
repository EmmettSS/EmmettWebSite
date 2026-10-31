import { describe, expect, it } from "vitest";

import { BRAND_GRADIENT_BASE, BRAND_INK, BRAND_LINK } from "@/lib/brand-colors";
import {
  buildRedirectMap,
  goneResponseHtml,
  normalizeRedirectKey,
  resolveRedirect,
  resolveTarget,
} from "@/lib/seo/redirects";
import type { SeoRedirect } from "@/lib/seo/types";

const redirects: SeoRedirect[] = [
  {
    from_path: "/old-services/",
    target: "/services/",
    status_code: 301,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    from_path: "/legacy",
    target: "https://partner.example/landing",
    status_code: 302,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    from_path: "/removed-page",
    target: "",
    status_code: 410,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("managed redirects", () => {
  it("normalizes keys the same way the backend does", () => {
    expect(normalizeRedirectKey("/Old-Services/?utm=1")).toBe("/old-services");
    expect(normalizeRedirectKey("/old-services/")).toBe("/old-services");
    expect(normalizeRedirectKey("/")).toBe("/");
  });

  it("matches requests regardless of trailing slash, case or query", () => {
    const map = buildRedirectMap(redirects);

    expect(resolveRedirect("/old-services/", map)?.status_code).toBe(301);
    expect(resolveRedirect("/OLD-SERVICES?ref=1", map)?.status_code).toBe(301);
    expect(resolveRedirect("/legacy", map)?.status_code).toBe(302);
    expect(resolveRedirect("/removed-page/", map)?.status_code).toBe(410);
    expect(resolveRedirect("/not-managed", map)).toBeNull();
  });

  it("resolves relative and absolute targets", () => {
    expect(resolveTarget("/services/", "https://emmett.example/old")).toBe(
      "https://emmett.example/services/",
    );
    expect(resolveTarget("https://partner.example/landing", "https://emmett.example/old")).toBe(
      "https://partner.example/landing",
    );
    expect(resolveTarget("   ", "https://emmett.example/old")).toBeNull();
  });

  it("renders a bilingual 410 page with noindex meta", () => {
    const fa = goneResponseHtml("fa");
    const en = goneResponseHtml("en");

    expect(fa).toContain('lang="fa-IR"');
    expect(fa).toContain('name="robots" content="noindex"');
    expect(fa).toContain("/search");
    expect(en).toContain('lang="en"');
    expect(en).toContain("/en/search");
    expect(en).not.toContain('<!doctype html><html lang="fa-IR"');
  });

  it("uses the shared emerald brand palette in 410 HTML with zero legacy navy/blue literals", () => {
    for (const locale of ["fa", "en"] as const) {
      const html = goneResponseHtml(locale);
      expect(html).toContain(`background:${BRAND_GRADIENT_BASE}`);
      expect(html).toContain(`color:${BRAND_INK}`);
      expect(html).toContain(`style="color:${BRAND_LINK}"`);
      for (const retired of ["#0b1220", "#93c5fd", "#f8fafc"]) {
        expect(html.toLowerCase()).not.toContain(retired);
      }
    }
  });
});
