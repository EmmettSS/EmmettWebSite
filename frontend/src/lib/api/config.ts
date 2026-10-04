/**
 * آدرس پایهٔ API بسته به محیط اجرا.
 *
 * - سمت مرورگر (client component): همیشه مسیر نسبی `/api/v1` — Next.js طبق
 *   `rewrites()` در `next.config.ts` آن را به بک‌اند Django پراکسی می‌کند
 *   (هم‌مبدا از دید مرورگر، بدون نیاز به CORS/کوکی cross-site).
 * - سمت سرور (Server Component/Route Handler): مستقیماً به آدرس داخلی
 *   بک‌اند Django (سرور-به-سرور، هرگز از طریق مرورگر عبور نمی‌کند).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  const internal = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";
  return `${internal}/api/v1`;
}
