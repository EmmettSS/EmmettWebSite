import { getApiBaseUrl, internalServiceHeaders } from "./config";
import { getSafeErrorType, logUpstreamFailure } from "./upstream-logging";
import type { RedirectPayload, SeoRedirect } from "@/lib/seo/types";

/**
 * کش درون‌حافظه‌ای ریدایرکت‌های مدیریت‌شده برای لایهٔ ``proxy`` (ADR-0041).
 *
 * چرا این فایل وجود دارد؟
 * ``proxy.ts`` (میان‌افزار Next 16) روی **هر** درخواست صفحه اجرا می‌شود. نسخهٔ
 * قبلی در همان‌جا ``getSeoRedirects()`` را صدا می‌زد و چون Next در لایهٔ
 * middleware/proxy به Data Cache دسترسی ندارد (گزینهٔ ``next.revalidate`` در
 * آن‌جا بی‌اثر است)، نتیجه یک رفت‌وبرگشت HTTP به Django **پیش از تولید هر
 * صفحه** بود؛ اندازه‌گیری روی همین ریپو نشان داد هر بازدید صفحه دقیقاً یک
 * ``GET /api/v1/seo/redirects/`` اضافه می‌کند.
 *
 * رفتار:
 * - TTL کوتاه (۶۰ ثانیه): تازگی کافی برای ویرایش‌های ادمین.
 * - Stale-while-revalidate: پس از TTL، پاسخ کهنهٔ موجود فوراً برگردانده و
 *   تازه‌سازی در پس‌زمینه انجام می‌شود (هیچ بازدیدکننده‌ای منتظر Django نمی‌ماند).
 * - Cold start: یک بار (حداکثر ۱٫۲ ثانیه) منتظر می‌ماند؛ اگر بک‌اند بالا نبود،
 *   آرایهٔ خالی برمی‌گرداند.
 * - **Backoff منفی**: پس از شکست، تا ۳۰ ثانیه تلاش دوباره نمی‌شود. بدون این
 *   قاعده، هر درخواست صفحه یک fetch تازه می‌زد و در حالت خطای بک‌اند (یا
 *   throttle) خودِ فرانت به بک‌اند حمله می‌کرد — دقیقاً همان چیزی که پیش از
 *   این تغییر رخ می‌داد.
 */
const TTL_MS = 60_000;
const FAILURE_BACKOFF_MS = 30_000;
const MAX_STALE_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 1_200;

let cached: SeoRedirect[] = [];
let fetchedAt = 0;
let lastFailureAt = 0;
let inflight: Promise<void> | null = null;

async function fetchRedirects(timeoutMs: number): Promise<SeoRedirect[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getApiBaseUrl()}/seo/redirects/`, {
      headers: { ...internalServiceHeaders(), "X-Forwarded-Proto": "https" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      logUpstreamFailure("django-redirect-cache", "/seo/redirects/", { status: response.status });
      return null;
    }
    const payload = (await response.json()) as RedirectPayload;
    return Array.isArray(payload?.results) ? payload.results : [];
  } catch (error) {
    logUpstreamFailure("django-redirect-cache", "/seo/redirects/", {
      errorType: getSafeErrorType(error),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function load(): Promise<void> {
  const fresh = await fetchRedirects(FETCH_TIMEOUT_MS);
  if (fresh) {
    cached = fresh;
    fetchedAt = Date.now();
  } else {
    lastFailureAt = Date.now();
  }
}

function refreshInBackground(): void {
  if (inflight) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

export async function getCachedSeoRedirects(): Promise<SeoRedirect[]> {
  const now = Date.now();
  const age = now - fetchedAt;

  if (fetchedAt > 0 && age < TTL_MS) return cached;
  if (age >= TTL_MS && age < MAX_STALE_MS) {
    if (now - lastFailureAt >= FAILURE_BACKOFF_MS) refreshInBackground();
    return cached;
  }

  // Cold start یا کهنگی طولانی یا شکست پیشین در بودجهٔ backoff.
  if (now - lastFailureAt < FAILURE_BACKOFF_MS) return cached;

  await load();
  return cached;
}

/** فقط برای تست — وضعیت ماژول را پاک می‌کند. */
export function __resetRedirectCacheForTests(): void {
  cached = [];
  fetchedAt = 0;
  lastFailureAt = 0;
  inflight = null;
}
