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
