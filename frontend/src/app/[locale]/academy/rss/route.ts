import { fetchFeed } from "@/lib/seo/feed";

export const revalidate = 900;

/** ``/academy/rss`` (فارسی) و ``/en/academy/rss`` (انگلیسی) — فید دوره‌ها. */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return fetchFeed("academy", locale);
}
