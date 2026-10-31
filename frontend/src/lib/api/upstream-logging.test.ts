import { describe, expect, it, vi } from "vitest";

import { getSafeErrorType, logUpstreamFailure } from "./upstream-logging";

describe("upstream failure logging", () => {
  it("records safe endpoint/status metadata without query strings or error messages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("authorization=private-token");

    logUpstreamFailure("django-ssr", "/search/?q=private-search-term", {
      status: 503,
      errorType: getSafeErrorType(error),
    });

    expect(errorSpy).toHaveBeenCalledWith("upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/search/",
      status: 503,
      error_type: "Error",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private-search-term");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private-token");
    errorSpy.mockRestore();
  });

  it("uses warnings for client responses and errors for upstream failures", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logUpstreamFailure("django-ssr", "/blog/missing/", { status: 404 });
    logUpstreamFailure("django-ssr", "/blog/", { status: 502 });
    logUpstreamFailure("django-ssr", "/blog/", { errorType: "AbortError" });

    expect(warnSpy).toHaveBeenCalledWith("upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/blog/missing/",
      status: 404,
    });
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenLastCalledWith("upstream_request_failed", {
      service: "django-ssr",
      endpoint: "/blog/",
      error_type: "AbortError",
    });
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
