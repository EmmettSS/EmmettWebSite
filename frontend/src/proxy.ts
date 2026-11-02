import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { getCachedSeoRedirects } from "@/lib/api/redirect-cache";
import {
  buildRedirectMap,
  goneResponseHtml,
  resolveRedirect,
  resolveTarget,
} from "@/lib/seo/redirects";
import { buildAlternateLinkHeader } from "@/lib/seo/site";

const intlMiddleware = createMiddleware(routing);

/**
 * سیاست امنیتی محتوا (CSP) — بدون nonce به‌ازای هر درخواست.
 *
 * تاریخچه (ADR-0041): نسخهٔ قبلی برای هر درخواست یک nonce تصادفی می‌ساخت و
 * ``script-src 'nonce-…' 'strict-dynamic'`` می‌داد. هر nonce در CSP، در Next.js
 * مستلزم آن است که صفحه **داینامیک** رندر شود؛ در نتیجه حتی صفحهٔ اصلی و بلاگ
 * که فقط محتوای عمومی نشان می‌دهند هم هر بار کامل SSR می‌شدند و هیچ صفحه‌ای
 * قابل pre-render/ISR نبود (خروجی ``next build`` برای ۲۵ مسیر «ƒ Dynamic»
 * بود). هزینهٔ آن تصمیم، یک رندر کامل Node + چند فراخوانی Django برای هر
 * بازدید بود.
 *
 * این فایل حالا سیاست ثابت می‌دهد تا صفحه‌های عمومی از کش HTML (ISR) سرو شوند.
 * مصالحهٔ امنیتی صریح و مستندشده: ``script-src`` شامل ``'unsafe-inline'`` است.
 * کاهش ریسک: (۱) هیچ اسکریپت مهمان/کاربری در HTML اولیه نیست — همهٔ HTML غنی
 * از CMS پیش از رندر با ``sanitize-html`` و در بک‌اند با ``nh3`` پاک‌سازی
 * می‌شود؛ (۲) ``object-src 'none'``، ``base-uri 'self'``، ``form-action 'self'``
 * و ``default-src 'self'`` سرجایش است، پس تزریق اسکریپت **خارجی** همچنان بسته
 * است؛ (۳) اگر در آینده Next.js اجازهٔ pre-render با nonce داد (PPR/Cache
 * Components)، بازگشت به nonce فقط یک تغییر در همین فایل است.
 */
function createContentSecurityPolicy(): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  // frame-ancestors is intentionally unset: Arena's preview renders the app in
  // a cross-origin iframe. Configure an explicit production allowlist at deploy.
  return directives.join("; ");
}

function localeFromPath(pathname: string): "fa" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fa";
}

/**
 * ریدایرکت‌های مدیریت‌شدهٔ ادمین (فاز ۷ — ADR-0031).
 *
 * پیش از روتینگ زبان اجرا می‌شود تا یک مسیر کهنه حتی اگر زبان هم نداشته باشد
 * سریع به مقصد برسد. داده از ``getCachedSeoRedirects`` می‌آید که یک کش
 * درون‌حافظه‌ای با TTL دارد؛ پیش‌تر هر درخواست یک fetch به
 * ``/api/v1/seo/redirects/`` می‌زد (کش دیتای Next در لایهٔ proxy فعال نیست)،
 * یعنی یک رفت‌وبرگشت HTTP به Django پیش از تولید هر صفحه.
 */
async function handleManagedRedirect(request: NextRequest): Promise<NextResponse | null> {
  const redirects = await getCachedSeoRedirects();
  if (redirects.length === 0) return null;

  const match = resolveRedirect(request.nextUrl.pathname, buildRedirectMap(redirects));
  if (!match) return null;

  if (match.status_code === 410) {
    return new NextResponse(goneResponseHtml(localeFromPath(request.nextUrl.pathname)), {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex",
        "cache-control": "public, s-maxage=3600",
      },
    });
  }

  const target = resolveTarget(match.target, request.url);
  if (!target) return null;
  return NextResponse.redirect(target, match.status_code);
}

/**
 * Next.js 16 uses proxy.ts rather than middleware.ts. next-intl keeps locale
 * routing here; the CSP is a static policy (see the comment above).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const redirectResponse = await handleManagedRedirect(request);
  if (redirectResponse) return redirectResponse;

  const contentSecurityPolicy = createContentSecurityPolicy();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const requestWithCsp = new NextRequest(request, { headers: requestHeaders });
  const response = intlMiddleware(requestWithCsp);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  // hreflang در هدر: با تگ‌های HTML هم‌منبع است (fa-IR/en/x-default) و مثل
  // متادیتا از ``PUBLIC_SITE_URL`` ساخته می‌شود، نه از هدر قابل‌جعل Host.
  const alternateLinks = buildAlternateLinkHeader(request.nextUrl.pathname);
  if (alternateLinks && !response.headers.has("Link")) {
    response.headers.set("Link", alternateLinks);
  }
  return response;
}

export const config = {
  // Apply CSP to pages and localized routes, not API responses or static assets.
  matcher: ["/((?!api|media|_next|_vercel|.*\\..*).*)"],
};
