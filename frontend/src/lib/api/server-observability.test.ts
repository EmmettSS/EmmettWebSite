import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getService, getServices, getSharedAISuggestion } from "./server";

describe("server API degradation logs", () => {
  const fetchMock = vi.fn();
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("logs 5xx and network failures while retaining the graceful null fallback", async () => {
    fetchMock.mockResolvedValueOnce(new Response("private upstream body", { status: 503 }));
    await expect(getServices("fa", "q=private-search-term")).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("authorization=private-token"));
    await expect(getServices("fa")).resolves.toBeNull();

    expect(errorSpy).toHaveBeenNthCalledWith(1, "upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/services/",
      status: 503,
    });
    expect(errorSpy).toHaveBeenNthCalledWith(2, "upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/services/",
      error_type: "Error",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private-search-term");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private-token");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private upstream body");
  });

  it("does not treat an expected missing CMS record as a server error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));

    await expect(getService("fa", "missing-service")).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith("upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/services/missing-service/",
      status: 404,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("redacts share tokens from AI result endpoint logs", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timed out"), { name: "AbortError" }));

    await expect(getSharedAISuggestion("en", "share-token-secret")).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalledWith("upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/ai/results/:token/",
      error_type: "AbortError",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("share-token-secret");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("timed out");
  });
});
