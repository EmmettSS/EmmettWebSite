import { NextResponse, type NextRequest } from "next/server";

/**
 * پراکسی سمت سرور برای ``/api/*`` — جایگزین ``rewrites()`` در next.config.ts
 * (ADR مرتبط: تصمیم معماری frontend↔backend در فاز ۴).
 *
 * چرا Route Handler به‌جای ``rewrites()``: تمام URLConfهای Django با اسلش
 * پایانی تعریف شده‌اند (``path("services/", ...)``)؛ موتور rewrite داخلی
 * Next.js هنگام جایگزینی ``:path*`` اسلش پایانی را حذف می‌کند، که باعث
 * ریدایرکت ۳۰۱ از Django (APPEND_SLASH) می‌شد و روی متدهای POST/PATCH به
 * GET تبدیل می‌گشت (کشف‌شده هنگام تست e2e فاز ۴). خواندن مستقیم
 * ``request.nextUrl.pathname`` در Route Handler، مسیر اصلی را بدون تغییر
 * (با همان اسلش پایانی) حفظ می‌کند.
 */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";

// هدرهایی که نباید مستقیماً عبور داده شوند (hop-by-hop یا مخصوص host فعلی).
const SKIP_REQUEST_HEADERS = new Set(["host", "connection", "content-length"]);
const SKIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function proxy(request: NextRequest): Promise<Response> {
  const targetUrl = `${INTERNAL_API_URL}${request.nextUrl.pathname}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  backendResponse.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // ``Headers.get("set-cookie")`` فقط یک مقدار ترکیبی می‌دهد؛ برای کوکی‌های
  // چندگانه (مثل csrftoken + sessionid) باید هرکدام جداگانه append شوند.
  const setCookieHeaders =
    typeof backendResponse.headers.getSetCookie === "function"
      ? backendResponse.headers.getSetCookie()
      : [];
  responseHeaders.delete("set-cookie");
  for (const cookie of setCookieHeaders) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
