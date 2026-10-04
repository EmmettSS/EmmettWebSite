import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: {
    // هرگز نباید در CI/production فعال شود؛ خطاهای TS باید build را بشکنند.
    ignoreBuildErrors: false,
  },
  // کد سمت مرورگر همیشه به مسیر نسبی `/api/v1/...` درخواست می‌زند؛
  // ``src/app/api/[...path]/route.ts`` آن را سمت سرور به بک‌اند Django
  // پراکسی می‌کند (هم‌مبدا از دید مرورگر، پس کوکی سشن/CSRF بدون پیچیدگی CORS
  // کار می‌کند). از ``rewrites()`` به‌جای Route Handler استفاده *نشده* چون
  // موتور rewrite داخلی Next اسلش پایانی مسیرها را حذف می‌کرد و با
  // APPEND_SLASH جنگو تداخل پیدا می‌کرد (ر.ک. کامنت بالای آن فایل).
  // بدون این گزینه، Next.js پیش از رسیدن درخواست به Route Handler، خودش
  // اسلش پایانی را حذف و ریدایرکت ۳۰۸ می‌دهد.
  skipTrailingSlashRedirect: true,

  // سخت‌سازی پایهٔ HTTP (فاز ۴ — بازبینی/سخت‌سازی): این‌ها مکمل
  // SECURE_* تنظیمات Django هستند که فقط پاسخ‌های بک‌اند را پوشش می‌دهند،
  // نه صفحات HTML رندرشده توسط Next.js. عمداً از ``X-Frame-Options`` /
  // ``Content-Security-Policy: frame-ancestors`` صرف‌نظر شده: محیط‌های
  // پیش‌نمایش توسعه (از جمله sandbox این پروژه) سایت را داخل یک iframe
  // از یک origin دیگر نمایش می‌دهند و این هدرها آن را کاملاً می‌بندند؛
  // تصمیم نهایی دربارهٔ frame-ancestors باید در فاز Deployment با دامنهٔ
  // واقعی production گرفته شود، نه اینجا با یک مقدار حدسی که محیط توسعه
  // را خراب می‌کند.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
