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
};

export default withNextIntl(nextConfig);
