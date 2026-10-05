import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

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

/**
 * Next.js 16 uses proxy.ts rather than middleware.ts. next-intl keeps locale
 * routing here, while a per-request CSP nonce protects the rendered pages.
 */
export function proxy(request: NextRequest): NextResponse {
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
