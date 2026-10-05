import { fetchFeed } from "@/lib/seo/feed";

export const revalidate = 900;

/** ``/blog/rss`` (فارسی) و ``/en/blog/rss`` (انگلیسی) — بازنشر فید بلاگ جنگو. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  return fetchFeed("blog", locale);
}
