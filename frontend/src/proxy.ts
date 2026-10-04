import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * در Next.js 16 قرارداد `middleware.ts` منسوخ و با `proxy.ts` جایگزین شده
 * (ر.ک. node_modules/next/dist/docs/.../proxy.md). تابع تولیدشدهٔ next-intl
 * دقیقاً همان امضای (request) => NextResponse را دارد، پس مستقیماً export
 * می‌شود.
 */
export const proxy = createMiddleware(routing);

export const config = {
  // همهٔ مسیرها به‌جز فایل‌های استاتیک/داخلی Next.js و API بک‌اند
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
