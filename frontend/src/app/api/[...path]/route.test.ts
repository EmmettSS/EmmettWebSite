import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

describe("/api/[...path] proxy route handler", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("preserves X-Forwarded-For and strips hop-by-hop host header on GET", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const req = new NextRequest("http://emmett.ir/api/v1/health/?probe=1", {
      headers: {
        host: "emmett.ir",
        "x-forwarded-for": "203.0.113.55",
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const [targetUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(targetUrl).toBe("http://127.0.0.1:8000/api/v1/health/?probe=1");
    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.get("x-forwarded-for")).toBe("203.0.113.55");
    expect(forwardedHeaders.get("host")).toBeNull();
  });

  it("proxies through the configured Passenger mount and normalizes a trailing slash", async () => {
    vi.stubEnv("INTERNAL_API_URL", "https://emmett.ir/backend/");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const req = new NextRequest("http://emmett.ir/api/v1/health/");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://emmett.ir/backend/api/v1/health/");
  });

  it("promotes X-Real-IP into X-Forwarded-For when X-Forwarded-For is absent on POST", async () => {
    const backendHeaders = new Headers({ "content-type": "application/json" });
    backendHeaders.append("set-cookie", "csrftoken=abc; Path=/");
    backendHeaders.append("set-cookie", "sessionid=xyz; Path=/; HttpOnly");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ created: true }), {
        status: 201,
        headers: backendHeaders,
      }),
    );

    const req = new NextRequest("http://emmett.ir/api/v1/leads/newsletter/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "203.0.113.77",
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.get("x-forwarded-for")).toBe("203.0.113.77");
    expect(forwardedHeaders.get("x-forwarded-proto")).toBe("https");
    expect(res.headers.getSetCookie()).toHaveLength(2);
  });

  it("returns clean 502 JSON without throwing when upstream backend is restarting", async () => {
    fetchMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const req = new NextRequest("http://emmett.ir/api/v1/health/live/");
    const res = await GET(req);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ detail: "Upstream backend unavailable." });
  });
});
