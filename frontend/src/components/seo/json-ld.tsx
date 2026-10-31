import type { JsonLdGraph } from "@/lib/seo/json-ld";

/**
 * رندر بلوک JSON-LD.
 *
 * تاریخچه (ADR-0041): نسخهٔ قبلی برای گرفتن ``nonce`` همان درخواست،
 * ``headers()`` را صدا می‌زد. هر ``headers()`` در Next.js صفحه را اجباراً
 * داینامیک می‌کند؛ به‌همین‌دلیل حتی صفحهٔ اصلی و بلاگ هم هیچ‌وقت pre-render
 * نمی‌شدند. CSP فعلی (``src/proxy.ts``) ثابت و بدون nonce است، پس دادهٔ
 * ساخت‌یافته بدون nonce هم اجرا/خوانده می‌شود و صفحه‌ها می‌توانند استاتیک باشند.
 */
export function JsonLd({ data }: { data: JsonLdGraph | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      // دادهٔ JSON از دادهٔ ساخت‌یافتهٔ خودمان تولید می‌شود؛ ``<`` برای
      // جلوگیری از بسته‌شدن تگ اسکریپت امن‌سازی می‌شود (OWASP XSS).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
