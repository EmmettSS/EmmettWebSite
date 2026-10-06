import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FONT_FAMILY_EN, FONT_FAMILY_FA, FONT_FAMILY_MONO } from "@/lib/fonts";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";
import { fetchFeed } from "@/lib/seo/feed";

describe("lib/seo/feed", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns 200 RSS XML when upstream succeeds", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<rss version='2.0'></rss>", { status: 200 }));
    const res = await fetchFeed("blog", "fa");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
    expect(await res.text()).toContain("<rss");
  });

  it("returns 502 when upstream fails or throws", async () => {
    fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
    const res1 = await fetchFeed("academy", "invalid-locale");
    expect(res1.status).toBe(502);

    fetchMock.mockRejectedValueOnce(new Error("connection refused"));
    const res2 = await fetchFeed("blog", "en");
    expect(res2.status).toBe(502);
  });
});

describe("lib/fonts & lib/hooks/use-has-mounted", () => {
  it("exports self-hosted font family constants", () => {
    expect(FONT_FAMILY_FA).toBe("Vazirmatn");
    expect(FONT_FAMILY_EN).toBe("Inter");
    expect(FONT_FAMILY_MONO).toBe("JetBrains Mono");
  });

  it("useHasMounted returns true in client test environment", () => {
    const { result } = renderHook(() => useHasMounted());
    expect(result.current).toBe(true);
  });
});
