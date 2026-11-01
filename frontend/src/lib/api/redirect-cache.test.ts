import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetRedirectCacheForTests, getCachedSeoRedirects } from "./redirect-cache";

/**
 * ADR-0041 — رفتار کش لایهٔ proxy.
 *
 * این تست از سه رگرسیون محافظت می‌کند:
 *  ۱) هر درخواست صفحه یک fetch تازه به Django نزند (باگ اصلی: یک رفت‌وبرگشت
 *     HTTP به‌ازای هر بازدید).
 *  ۲) پس از شکست بک‌اند، فرانت در حلقهٔ تلاش نیفتد (bootstrapping storm).
 *  ۳) تا وقتی داده کش‌شده معتبر است، حتی یک درخواست تازه هم زده نشود.
 */
const redirectPayload = {
  results: [{ source_path: "/old", target: "/new", status_code: 301, is_active: true }],
};

describe("getCachedSeoRedirects", () => {
  beforeEach(() => {
    __resetRedirectCacheForTests();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(redirectPayload), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("فقط یک بار در TTL به بک‌اند می‌زند", async () => {
    const first = await getCachedSeoRedirects();
    await getCachedSeoRedirects();
    await getCachedSeoRedirects();

    expect(first).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("پس از پایان TTL دادهٔ کهنه را فوراً می‌دهد و در پس‌زمینه تازه می‌کند", async () => {
    await getCachedSeoRedirects();
    vi.advanceTimersByTime(61_000);

    const stale = await getCachedSeoRedirects();
    expect(stale).toHaveLength(1);
    // تازه‌سازی پس‌زمینه یک بار برنامه‌ریزی می‌شود، نه به‌ازای هر فراخوانی.
    await getCachedSeoRedirects();
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
  });

  it("در خطای بک‌اند آرایهٔ خالی می‌دهد و تا پایان backoff تلاش نمی‌کند", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    expect(await getCachedSeoRedirects()).toEqual([]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // در بازهٔ ۳۰ ثانیه هیچ درخواست تازه‌ای نباید زده شود.
    for (let i = 0; i < 20; i += 1) {
      await getCachedSeoRedirects();
    }
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // بعد از backoff یک بار دیگر تلاش می‌کند.
    vi.advanceTimersByTime(31_000);
    await getCachedSeoRedirects();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});
