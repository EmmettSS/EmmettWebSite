import { headers } from "next/headers";

import type { JsonLdGraph } from "@/lib/seo/json-ld";

/**
 * رندر بلوک JSON-LD با ``nonce`` همان درخواست.
 *
 * چرا nonce لازم است؟ CSP فرانت (``src/proxy.ts``) هیچ اسکریپت درون‌خطی بدون
 * nonce را اجرا نمی‌کند؛ بدون nonce مرورگر دادهٔ ساخت‌یافته را نادیده می‌گیرد
 * (بوت‌های جست‌وجو مستقل‌اند، ولی مرورگر خطای CSP می‌دهد و گزارش‌ها شلوغ
 * می‌شود). ``headers()`` در Next 15+ async است.
 */
export async function JsonLd({ data }: { data: JsonLdGraph | null }) {
  if (!data) return null;
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // دادهٔ JSON از دادهٔ ساخت‌یافتهٔ خودمان تولید می‌شود؛ ``<`` برای
      // جلوگیری از بسته‌شدن تگ اسکریپت امن‌سازی می‌شود (OWASP XSS).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
