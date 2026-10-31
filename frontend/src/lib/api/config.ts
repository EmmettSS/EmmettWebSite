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
