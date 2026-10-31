import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function request(body: unknown, authorization = "Bearer test-secret") {
  return new Request("http://emmett.ir/api/revalidate", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/revalidate", () => {
  beforeEach(() => {
    vi.stubEnv("FRONTEND_REVALIDATE_SECRET", "test-secret");
    vi.mocked(revalidateTag).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires the shared secret and fails closed when it is not configured", async () => {
    vi.stubEnv("FRONTEND_REVALIDATE_SECRET", "");
    const response = await POST(request({ tags: ["content:blog"] }));

    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without touching the cache", async () => {
    const response = await POST(request({ tags: ["content:blog"] }, "Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("validates every tag before invalidating any of them", async () => {
    const response = await POST(request({ tags: ["content:blog", "arbitrary:tag"] }));

    expect(response.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires only approved tags immediately and de-duplicates the request", async () => {
    const response = await POST(request({ tags: ["content:blog", "feed:blog", "content:blog"] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: ["content:blog", "feed:blog"] });
    expect(revalidateTag).toHaveBeenNthCalledWith(1, "content:blog", { expire: 0 });
    expect(revalidateTag).toHaveBeenNthCalledWith(2, "feed:blog", { expire: 0 });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("logs cache invalidation failures without exposing exception text", async () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("private cache error details");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request({ tags: ["content:blog"] }));

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith("upstream_request_failed", {
      service: "next-cache",
      endpoint: "/api/revalidate",
      status: 500,
      error_type: "Error",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private cache error details");
    errorSpy.mockRestore();
  });

  it("rejects payloads larger than the bounded request size", async () => {
    const oversized = new Request("http://emmett.ir/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: JSON.stringify({ tags: ["content:blog"], padding: "x".repeat(5000) }),
    });
    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const malformed = new Request("http://emmett.ir/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: "not-json",
    });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
