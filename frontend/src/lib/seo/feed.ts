/**
 * بازنشر فیدهای RSS جنگو در مسیرهای زبان‌دار فرانت‌اند (فاز ۷ — ADR-0031).
 *
 * تصمیم Q7 فاز ۷: تولید فید در جنگو می‌ماند (``/api/v1/blog/rss`` و
 * ``/api/v1/academy/rss``) چون همان کوئری‌های بهینه و زبان‌بندی Django را
 * دارد؛ فرانت فقط آن را روی مسیر عمومی ``/{blog|academy}/rss`` سرو می‌کند تا
 * برای خزنده‌ها/خواننده‌های فید یک URL پایدار و لینک‌شدنی وجود داشته باشد.
 */

import { getApiBaseUrl } from "@/lib/api/config";
import { isAppLocale } from "@/lib/seo/site";

export const FEED_REVALIDATE_SECONDS = 900;

export type FeedKind = "blog" | "academy";

export async function fetchFeed(kind: FeedKind, locale: string): Promise<Response> {
  // مسیرهای فید بدون نقطه‌اند تا از ماتcher میان‌افزار next-intl رد نشوند.
  const language = isAppLocale(locale) ? locale : "fa";
  const url = `${getApiBaseUrl()}/${kind}/rss/?language=${encodeURIComponent(language)}`;

  try {
    const upstream = await fetch(url, {
      headers: { "Accept-Language": language },
      next: { revalidate: FEED_REVALIDATE_SECONDS },
    });
    if (!upstream.ok) {
      return new Response("feed unavailable\n", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(await upstream.text(), {
      status: 200,
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": `public, s-maxage=${FEED_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
      },
    });
  } catch {
    return new Response("feed unavailable\n", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
