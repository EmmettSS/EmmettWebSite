/**
 * انتخاب فونت (ر.ک. ADR-0018):
 * - فارسی: Vazirmatn — پوشش کامل یونیکد فارسی/عربی + اعداد فارسی، متریک
 *   نزدیک به طبقهٔ «Grotesque Sans» خواستهٔ اسپک طراحی، متن‌باز/رایگان.
 * - لاتین: Inter — دقیقاً همان فونتی که اسپک طراحی به‌عنوان نمونهٔ
 *   «Grotesque Sans» ذکر کرده.
 * - مونو (برچسب‌های متادیتا/اعداد فنی، بخش B2 اسپک طراحی): JetBrains Mono.
 *
 * نکتهٔ مهم دربارهٔ روش بارگذاری: ابتدا `next/font/google` امتحان شد، اما در
 * محیط build این sandbox دسترسی شبکه به fonts.googleapis.com مسدود بود و
 * build را می‌شکست. برای حذف کامل وابستگی build-time به شبکهٔ خارجی (و
 * قابلیت اطمینان بیشتر روی هاست اشتراکی production)، فونت‌ها از طریق پکیج
 * خوداستقرار `@fontsource/*` (فایل‌های واقعی woff2 در node_modules، نصب‌شده
 * از npm registry) و `@import` مستقیم در `globals.css` بارگذاری می‌شوند.
 * این تصمیم و جایگزین next/font در ADR-0018 مستند شده است.
 */

export const FONT_FAMILY_FA = "Vazirmatn";
export const FONT_FAMILY_EN = "Inter";
export const FONT_FAMILY_MONO = "JetBrains Mono";
