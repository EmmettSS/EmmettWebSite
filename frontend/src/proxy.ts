import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { getSeoRedirects } from "@/lib/api/seo";
import {
  buildRedirectMap,
  goneResponseHtml,
  resolveRedirect,
  resolveTarget,
} from "@/lib/seo/redirects";

const intlMiddleware = createMiddleware(routing);

function createContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
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
 * سریع به مقصد برسد. نگاشت از ``/api/v1/seo/redirects/`` و کش‌شده است
 * (``revalidate`` ۳۰۰ ثانیه)، پس هزینهٔ هر درخواست یک جست‌وجوی Map است.
 */
async function handleManagedRedirect(request: NextRequest): Promise<NextResponse | null> {
  const redirects = await getSeoRedirects();
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
 * routing here, while a per-request CSP nonce protects the rendered pages.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const redirectResponse = await handleManagedRedirect(request);
  if (redirectResponse) return redirectResponse;

  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  // next-intl forwards these request headers to the localized page; Next.js
  // extracts the nonce from CSP and attaches it to framework-generated scripts.
  const requestWithCsp = new NextRequest(request, { headers: requestHeaders });
  const response = intlMiddleware(requestWithCsp);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  // Apply CSP to pages and localized routes, not API responses or static assets.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
