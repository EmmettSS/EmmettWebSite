import { routing } from "@/i18n/routing";

import { getBlogPosts, getCourses, getProjects, getServices } from "./server";

/**
 * ساخت پارامترهای مسیرهای جزئیات برای pre-render در زمان بیلد (ADR-0041).
 *
 * چرا: مسیرهای `[slug]` بدون `generateStaticParams` در هر درخواست رندر
 * می‌شدند. اندازه‌گیری روی همین ریپو: بازدید اول ۳۷–۱۰۷ میلی‌ثانیه و بازدیدهای
 * بعدی ۱۱–۲۵ میلی‌ثانیه، در حالی که صفحه‌های فهرست از کش ISR در ~۲٫۴
 * میلی‌ثانیه سرو می‌شدند. صفحه‌های جزئیات همان چیزی هستند که از جست‌وجوی گوگل
 * می‌آیند، پس گران‌ترین بازدید برای گران‌ترین کاربر بود.
 *
 * قواعد:
 * - اگر بک‌اند در زمان بیلد بالا نباشد، این تابع آرایهٔ خالی برمی‌گرداند و
 *   مسیرها با `dynamicParams` پیش‌فرض در نخستین درخواست رندر و کش می‌شوند؛
 *   یعنی بیلد هرگز به‌خاطر خاموش‌بودن API شکست نمی‌خورد.
 * - سقف ۱۰۰ مورد در هر نوع محتوا (یک صفحهٔ API). باقی موارد در نخستین بازدید
 *   ساخته و توسط ISR کش می‌شوند.
 * - هر مورد صفحه‌ای با همان `revalidate` مسیر مدرک می‌گیرد؛ وب‌هوک
 *   `/api/revalidate` با تگ مربوطه آن را فوری تازه می‌کند.
 */
const MAX_ITEMS = 100;

export interface DetailRouteParams {
  locale: string;
  slug: string;
}

type ListFetcher<T> = (locale: string, searchParams?: string) => Promise<{ results: T[] } | null>;

async function buildParams<T extends { slug: string }>(fetchList: ListFetcher<T>) {
  const perLocale = await Promise.all(
    routing.locales.map(async (locale) => {
      const page = await fetchList(locale, `page_size=${MAX_ITEMS}`);
      return (page?.results ?? []).map((item) => ({ locale, slug: item.slug }));
    }),
  );
  return perLocale.flat();
}

export const serviceDetailParams = () => buildParams(getServices);
export const projectDetailParams = () => buildParams(getProjects);
export const courseDetailParams = () => buildParams(getCourses);
export const blogDetailParams = () => buildParams(getBlogPosts);
