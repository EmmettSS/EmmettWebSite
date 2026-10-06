/**
 * ریدایرکت‌های مدیریت‌شده در لایهٔ Next.js (فاز ۷ — ADR-0031).
 *
 * مدیر محتوا در ادمین جنگو یک رکورد ``Redirect`` می‌سازد (۳۰۱/۳۰۲/۴۱۰) و همان
 * لحظه در ``/api/v1/seo/redirects/`` دیده می‌شود. این ماژول فقط «تطبیق مسیر»
 * را انجام می‌دهد؛ هیچ منطق دیگری ندارد و خالص/قابل‌تست است:
 *
 * - مسیر درخواست نرمال می‌شود (اسلش پایانی، حروف بزرگ، کوئری‌استرینگ).
 * - مقصد می‌تواند نسبی (``/services/web/``) یا مطلق (``https://…``) باشد.
 * - ``410`` یعنی «برای همیشه حذف شده» و پاسخ HTML با ``X-Robots-Tag: noindex``
 *   برمی‌گرداند (اختلاف مهم با ۴۰۴: خزنده سریع‌تر حذف می‌کند).
 */

import type { SeoRedirect } from "@/lib/seo/types";

export interface RedirectMatch {
  status: 301 | 302;
  location: string;
}

/** نرمال‌سازی همان‌قاعدهٔ ``core.normalize_redirect_path`` در بک‌اند. */
export function normalizeRedirectKey(path: string): string {
  const [withoutQuery = ""] = path.split(/[?#]/, 1);
  const collapsed = withoutQuery.replace(/\/{2,}/g, "/");
  const lowered = collapsed.toLowerCase();
  if (lowered.length > 1) {
    return lowered.replace(/\/+$/, "");
  }
  return lowered;
}

/** نگاشت ``path نرمال‌شده → رکورد`` برای جست‌وجوی O(1). */
export function buildRedirectMap(redirects: SeoRedirect[]): Map<string, SeoRedirect> {
  const map = new Map<string, SeoRedirect>();
  for (const redirect of redirects) {
    map.set(normalizeRedirectKey(redirect.from_path), redirect);
  }
  return map;
}

export function resolveRedirect(path: string, map: Map<string, SeoRedirect>): SeoRedirect | null {
  return map.get(normalizeRedirectKey(path)) ?? null;
}

/** مقصد را به URL کامل تبدیل می‌کند (نسبی: روی همان مبدأ). */
export function resolveTarget(target: string, requestUrl: string): string | null {
  const trimmed = target.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, requestUrl).toString();
}

/**
 * صفحهٔ ۴۱۰ — دو زبانه و بدون وابستگی به React.
 *
 * متن در ازای ``Accept-Language`` (پارامتر ``?language=`` هم پذیرفته می‌شود)
 * انتخاب می‌شود. این HTML استاتیک است و از CSP عبور می‌کند چون هیچ اسکریپت
 * درون‌خطی ندارد.
 */
export function goneResponseHtml(locale: "fa" | "en" = "fa"): string {
  const isPersian = locale === "fa";
  const title = isPersian ? "۴۱۰ — صفحه حذف شده است" : "410 — Page removed";
  const body = isPersian
    ? "این صفحه برای همیشه حذف شده است. می‌توانید از صفحهٔ اصلی یا جست‌وجوی سایت ادامه دهید."
    : "This page has been permanently removed. Continue from the home page or site search.";
  const homeLabel = isPersian ? "بازگشت به صفحهٔ اصلی" : "Back to home";
  const searchLabel = isPersian ? "جست‌وجو در سایت" : "Search the site";
  const homeHref = isPersian ? "/" : "/en";
  const searchHref = isPersian ? "/search" : "/en/search";
  const direction = isPersian ? "rtl" : "ltr";

  return `<!doctype html><html lang="${isPersian ? "fa-IR" : "en"}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center"><main style="max-width:34rem;padding:2rem;text-align:center"><h1 style="font-size:1.75rem;margin:0 0 1rem">${title}</h1><p style="line-height:1.9;opacity:.85;margin:0 0 1.5rem">${body}</p><p style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:0"><a href="${homeHref}" style="color:#93c5fd">${homeLabel}</a><a href="${searchHref}" style="color:#93c5fd">${searchLabel}</a></p></main></body></html>`;
}
