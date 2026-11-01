/**
 * آدرس پایهٔ API بسته به محیط اجرا.
 *
 * - سمت مرورگر (client component): همیشه مسیر نسبی `/api/v1` — Route Handler
 *   اختصاصی Next.js آن را به mount بک‌اند Django پراکسی می‌کند
 *   (هم‌مبدا از دید مرورگر، بدون نیاز به CORS/کوکی cross-site).
 * - سمت سرور (Server Component/Route Handler): به mount اختصاصی Passenger
 *   برای Django (سرور-به-سرور؛ در cPanel برابر /backend و در توسعهٔ محلی 127.0.0.1:8000).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  const internal = (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  return `${internal}/api/v1`;
}

/**
 * بودجهٔ زمانی هر فراخوانی سرور-به-سرور به Django (میلی‌ثانیه).
 *
 * بدون این سقف، ``fetch`` نود تا پیش‌فرض undici (۳۰۰ ثانیه) صبر می‌کند؛ روی
 * هاست اشتراکی که Passenger پروسهٔ پایتون را سرد بالا می‌آورد یا بک‌اند موقتاً
 * قفل شده، یعنی یک صفحه تا پنج دقیقه معلق می‌ماند. با این سقف صفحه با محتوای
 * پیش‌فرض/ناقص رندر می‌شود (تخریب مهربان) و خطا در لاگ ثبت می‌شود.
 */
export const UPSTREAM_TIMEOUT_MS = 5_000;

/**
 * هدرهای احراز هویت سرور-به-سرور (ADR-0041).
 *
 * همهٔ فراخوانی‌های Server Component/ISR از loopback می‌آیند و در Django یک
 * هویت ناشناس مشترک دارند؛ با نرخ پیش‌فرض ۱۰۰/ساعت، رندر صفحات پس از مدتی
 * با ۴۲۹ خالی می‌شد. این توکن (فقط سمت سرور، بدون پیشوند NEXT_PUBLIC_) آن
 * فراخوانی‌ها را از throttle ناشناس معاف می‌کند.
 */
export function internalServiceHeaders(): Record<string, string> {
  const token = process.env.INTERNAL_API_TOKEN?.trim();
  return token ? { "X-Internal-Token": token } : {};
}
