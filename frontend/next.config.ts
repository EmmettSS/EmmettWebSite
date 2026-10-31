import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * میزبان‌های مجاز تصویر برای ``next/image`` (فاز ۷ — ADR-0032).
 *
 * تصاویر رسانه از بک‌اند Django می‌آیند؛ اگر میزبان در این فهرست نباشد،
 * بهینه‌ساز Next.js خطای ۴۰۰ می‌دهد. میزبان از ``INTERNAL_API_URL`` (محیط
 * اجرا) و در صورت نبود، از پیش‌فرض توسعه استخراج می‌شود تا هیچ دامنه‌ای در کد
 * hard-code نشود (قانون ۵).
 */
function mediaHostnames(): string[] {
  const hosts = new Set<string>(["127.0.0.1", "localhost"]);
  for (const candidate of [
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    if (!candidate) continue;
    try {
      hosts.add(new URL(candidate).hostname);
    } catch {
      // مقدار نامعتبر نباید build را بشکند؛ پیش‌فرض‌ها کافی‌اند.
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  typescript: {
    // هرگز نباید در CI/production فعال شود؛ خطاهای TS باید build را بشکنند.
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  // فشرده‌سازی gzip برای پاسخ‌های داینامیک (پیش‌فرض Next) صریح نوشته می‌شود.
  // توجه (اندازه‌گیری‌شده در ADR-0041): فایل‌های `/_next/static/*.js` با
  // `next start` **فشرده‌نشده** سرو می‌شوند؛ فشرده‌سازی آن‌ها وظیفهٔ Apache/
  // Passenger است — بلوک mod_deflate/mod_brotli در
  // `backend/deploy/public_html.htaccess.example` بند ۳.
  compress: true,
  // کد سمت مرورگر همیشه به مسیر نسبی `/api/v1/...` درخواست می‌زند؛
  // ``src/app/api/[...path]/route.ts`` آن را سمت سرور به بک‌اند Django
  // پراکسی می‌کند (هم‌مبدا از دید مرورگر، پس کوکی سشن/CSRF بدون پیچیدگی CORS
  // کار می‌کند). از ``rewrites()`` به‌جای Route Handler استفاده *نشده* چون
  // موتور rewrite داخلی Next اسلش پایانی مسیرها را حذف می‌کرد و با
  // APPEND_SLASH جنگو تداخل پیدا می‌کرد (ر.ک. کامنت بالای آن فایل).
  // بدون این گزینه، Next.js پیش از رسیدن درخواست به Route Handler، خودش
  // اسلش پایانی را حذف و ریدایرکت ۳۰۸ می‌دهد.
  skipTrailingSlashRedirect: true,

  // بهینه‌سازی تصویر (فاز ۷ — ADR-0032): خروجی AVIF/WebP با اندازهٔ مناسب
  // viewport یعنی کاهش شدید حجم انتقال در مقایسه با JPEG/PNG خام، و کش طولانی
  // برای جلوگیری از بهینه‌سازی مکرر روی هاست اشتراکی.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/**" }],
    remotePatterns: mediaHostnames().flatMap((hostname) => [
      { protocol: "http" as const, hostname },
      { protocol: "https" as const, hostname },
    ]),
  },

  // آدرس‌های قراردادی فید (``.xml``) به مسیرهای نقطه‌دار داخلی نمی‌روند، چون
  // میان‌افزار زبان مسیرهای دارای نقطه را رد می‌کند (ADR-0031)؛ اینجا یک
  // ریدایرکت دائمی به مسیر بدون نقطه نگاشت می‌شود.
  async redirects() {
    return [
      { source: "/blog/rss.xml", destination: "/blog/rss", permanent: true },
      { source: "/academy/rss.xml", destination: "/academy/rss", permanent: true },
      { source: "/en/blog/rss.xml", destination: "/en/blog/rss", permanent: true },
      { source: "/en/academy/rss.xml", destination: "/en/academy/rss", permanent: true },
      { source: "/feed", destination: "/blog/rss", permanent: true },

      // صفحهٔ «به‌زودی»ِ Pentestor برای همیشه به صفحهٔ واقعیِ دیتابیسی‌اش
      // واگذار می‌کند (ADR-0040 بند ۵، گزینهٔ ۱ با تصمیم صریح مالک محصول).
      //
      // چرا: `/projects/pentestor` محتوای واقعی دارد (مطالعهٔ موردی، در
      // sitemap، canonical خودش) در حالی که `/products/pentestor` یک
      // ComingSoonِ ایستا بود. پس از اصلاح canonical در بستهٔ ۳ دیگر هیچ‌کدام
      // به دیگری دروغ نمی‌گفت، ولی دو صفحهٔ هم‌موضوع و هر دو index‌پذیر
      // باقی مانده بودند. این ریدایرکت تمام سیگنال‌ها را در مقصد واحد جمع
      // می‌کند و کاربر را هم از پالت ⌘K به صفحهٔ واقعی می‌رساند.
      //
      // هر دو زبان **صریح** نوشته می‌شوند چون این لایه پیش از روتینگ زبانِ
      // میان‌افزار اعمال می‌شود — همان الگویی که ریدایرکت‌های RSS بالا دارند.
      //
      // `/products/crm` عمداً ریدایرکت **نمی‌شود**: CRM در دیتابیس نیست
      // (`/api/v1/projects/?is_product=true` ⇒ `count=1`، فقط pentestor) و
      // `/projects/crm` ‏404 می‌دهد، پس واگذاری به آن یعنی شکستن لینک. آن
      // صفحه باید «به‌زودی» بماند.
      //
      // `permanent: true` در Next.js کد **308** می‌دهد نه 301؛ این API گزینهٔ
      // 301 ندارد و هر چهار ریدایرکت دائمیِ بالای این فایل هم 308 هستند
      // (اندازه‌گیری‌شده). ۳۰۸ ریدایرکت دائمیِ استاندارد است و موتورهای
      // جست‌وجو برای تجمیع سیگنال همانند ۳۰۱ رفتار می‌کنند؛ یک‌دستی با
      // بقیهٔ ریپو بر عددِ کد وضعیت اولویت دارد.
      { source: "/products/pentestor", destination: "/projects/pentestor", permanent: true },
      {
        source: "/en/products/pentestor",
        destination: "/en/projects/pentestor",
        permanent: true,
      },
    ];
  },

  // سخت‌سازی پایهٔ HTTP (فازهای ۴/۵): این هدرها مکمل SECURE_* جنگو هستند.
  // CSP با nonce در src/proxy.ts ست می‌شود تا با hydration سازگار بماند؛
  // عمداً frame-ancestors/X-Frame-Options تنظیم نشده تا iframe پیش‌نمایش
  // sandbox کار کند. برای production دامنهٔ واقعی باید allowlist مشخص شود.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // عمداً X-Frame-Options/``frame-ancestors`` اینجا ست نمی‌شود: پیش‌نمایش
          // sandbox داخل iframe کراس‌اوریجین رندر می‌شود (ر.ک. کامنت بالا).
          // سخت‌سازی نهایی با ``CSP_FRAME_ANCESTORS`` در لایهٔ deploy انجام می‌شود.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
