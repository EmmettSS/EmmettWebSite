import type { ToolMeta } from "../types";

export const meta: ToolMeta = {
  id: "jalali",
  slug: { fa: "tarikh-shamsi", en: "jalali-date" },
  title: { fa: "محاسبات تاریخ شمسی", en: "Jalali date calculator" },
  subtitle: {
    fa: "تبدیل شمسی ↔ میلادی، اختلاف دو تاریخ، روز کاری با تعطیلات نسخه‌دار و تبدیل انبوه.",
    en: "Jalali ↔ Gregorian conversion, date differences, business days with a versioned holiday calendar and bulk conversion.",
  },
  description: {
    fa: "تبدیل‌ها با الگوریتم حسابی بورکوفسکی انجام می‌شود؛ سال کبیسه از چرخهٔ ۳۳ساله محاسبه می‌شود، نه از جدول دستی. منطق کد بین مرورگر و سرور مشترک است، پس ابزار آفلاین هم کار می‌کند.",
    en: "Conversions use Borkowski's arithmetic algorithm: leap years come from a 33-year cycle, never a hand-written table. The same logic runs in the browser and on the server, so the tool works offline too.",
  },
  capability: "backend",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: { fa: ["تاریخ شمسی", "تبدیل تاریخ", "روز کاری", "تعطیلات", "تقویم"], en: ["jalali", "persian date", "convert", "workdays", "holidays"] },
  evidence: { fa: "شاهد زنده: تبدیل و محاسبهٔ همین صفحه", en: "Live artifact: the conversion on this page" },
  howItWorks: {
    fa: [
      "هر تاریخ شمسی به یک «شمارهٔ روز» (روزهای گذشته از ۱۹۷۰-۰۱-۰۱) نگاشت می‌شود. تمام محاسبات — اختلاف، افزودن روز، روز کاری و فاصله تا نوروز — روی همین عدد انجام می‌شود، پس هیچ خطای مرز ماه یا سال پیش نمی‌آید.",
      "سال کبیسه با الگوریتم چرخهٔ ۳۳ساله و نقاط تصحیح مستند محاسبه می‌شود. بازهٔ پشتیبانی‌شده ۱۲۰۰ تا ۱۵۰۰ شمسی است و خارج از آن پیام روشن می‌گیرید، نه خطای خام.",
      "تعطیلات رسمی از یک منبع نسخه‌دار در پایگاه داده خوانده می‌شود؛ اگر سالی داده نداشته باشد، ابزار صادقانه می‌گوید فقط جمعه‌ها را در نظر گرفته است.",
    ],
    en: [
      "Every Jalali date is mapped to a day number (days since 1970-01-01). All arithmetic — differences, adding days, business days and distance to Nowruz — runs on that number, so month and year boundaries cannot drift.",
      "Leap years come from the documented 33-year cycle with correction breaks. The supported range is 1200–1500 Jalali; outside it you get a clear message instead of a raw error.",
      "Official holidays are served from a versioned database source; if a year has no data, the tool says plainly that only Fridays were skipped.",
    ],
  },
  howToSteps: {
    fa: [
      { name: "تاریخ را وارد کنید", text: "تاریخ شمسی یا میلادی را با ارقام فارسی/عربی/لاتین و جداکنندهٔ / یا - وارد کنید." },
      { name: "نتیجه را ببینید", text: "معادل تاریخ، روز هفتهٔ فارسی، شمارهٔ روز سال و وضعیت کبیسه بلافاصله نمایش داده می‌شود." },
      { name: "محاسبه یا اشتراک", text: "در تب محاسبات روز کاری را حساب کنید یا با دکمهٔ اشتراک لینک دائمی بگیرید." },
    ],
    en: [
      { name: "Enter a date", text: "Type a Jalali or Gregorian date with Persian, Arabic or Latin digits and / or - separators." },
      { name: "Read the result", text: "The equivalent date, Persian weekday, day-of-year and leap status appear immediately." },
      { name: "Calculate or share", text: "Use the calculations tab for business days, or create a permanent share link." },
    ],
  },
  codeSamples: [
    {
      label: "TypeScript — هستهٔ تبدیل",
      language: "ts",
      code: `function g2d(y: number, m: number, d: number): number {
  let n = Math.trunc((y + Math.trunc((m - 8) / 6) + 100100) * 1461 / 4)
        + Math.trunc((153 * ((m + 9) % 12) + 2) / 5) + d - 34840408;
  return n - Math.trunc(Math.trunc((y + 100100 + Math.trunc((m - 8) / 6)) / 100) * 3 / 4) + 752;
}

// j2d/d2j همین را با چرخهٔ ۳۳ساله ترکیب می‌کنند؛ هر دو در lib/jalali.ts`,
    },
    {
      label: "Python — همان الگوریتم برای سرور",
      language: "python",
      code: `def gregorian_to_jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    jdn = g2d(gy, gm, gd)
    return d2j(jdn)  # همان روز-شمار صفر تا صفر، پس نتیجه مو‌به‌مو یکی است`,
    },
  ],
  limitations: {
    fa: [
      "بازهٔ سال‌ها ۱۲۰۰ تا ۱۵۰۰ شمسی است (۱۲۱۷ تا ۲۱۲۱ میلادی حدوداً).",
      "تبدیل انبوه حداکثر ۱۰۰۰ خط در هر بار است.",
      "«امروز» بر اساس منطقهٔ زمانی Asia/Tehran محاسبه می‌شود.",
      "تعطیلات رسمی تنها زمانی اعمال می‌شود که تقویم نسخه‌دار آن سال در سامانه ثبت شده باشد.",
    ],
    en: [
      "Supported range: 1200–1500 Jalali (roughly 1821–2122 Gregorian).",
      "Bulk conversion accepts at most 1000 lines per run.",
      "“Today” is computed in the Asia/Tehran timezone.",
      "Official holidays apply only when that year's versioned calendar is loaded in the system.",
    ],
  },
  offlineCapable: true,
  noindexResults: true,
};
