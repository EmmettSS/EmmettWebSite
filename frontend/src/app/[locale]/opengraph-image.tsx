import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { toAppLocale } from "@/lib/seo/site";

/**
 * تصویر Open Graph پیش‌فرض هر زبان (فاز ۷ — ADR-0031).
 *
 * چرا فونت را از ``public/fonts`` می‌خوانیم؟ متن فارسی بدون فونت دارای گلیف
 * فارسی، در ``ImageResponse`` به‌صورت مربع خالی رندر می‌شود. فونت وزیرمتن
 * (SIL OFL — مجوزش کنار همان فایل در ریپو است) به همین دلیل در ``public``
 * نگه داشته می‌شود؛ اگر فایل در دسترس نباشد، تصویر با فونت پیش‌فرض ساخته
 * می‌شود و رندر صفحه شکست نمی‌خورد.
 *
 * قالب فایل: ``satori`` (موتور ``next/og``) امضای ``wOF2`` را پشتیبانی
 * **نمی‌کند** و با خطای «Unsupported OpenType signature wOF2» build را
 * می‌شکند — کشف‌شده در build فاز ۷. بنابراین نسخهٔ ``.woff`` همان وزن
 * استفاده می‌شود (woff2 فقط برای ``preload`` مرورگر می‌ماند).
 *
 * اندازهٔ استاندارد ۱۲۰۰×۶۳۰ است (همان مقداری که در متادیتای OG اعلام می‌شود).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Emmett — software engineering studio";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function readFontFile(fileName: string): Promise<ArrayBuffer | null> {
  try {
    const file = await readFile(path.join(process.cwd(), "public", "fonts", fileName));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

/**
 * فونت وزیرمتن در دو زیرمجموعهٔ جدا توزیع می‌شود (``arabic`` و ``latin``) و
 * هیچ‌کدام گلیف دیگری را ندارد؛ اگر فقط زیرمجموعهٔ عربی ثبت شود، متن لاتین
 * (نشان برند) به‌صورت تکه‌های ناقص رندر می‌شود — همان چیزی که در build فاز ۷
 * دیدیم. هر دو زیرمجموعه با نام‌های جدا به ``satori`` داده می‌شوند و هر متن
 * فونت مناسب خودش را می‌گیرد.
 */
async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; style: "normal"; weight: 700 }[]
> {
  const [arabic, latin] = await Promise.all([
    readFontFile("vazirmatn-arabic-700.woff"),
    readFontFile("vazirmatn-latin-700.woff"),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 700 }[] = [];
  if (arabic) {
    fonts.push({ name: "VazirmatnArabic", data: arabic, style: "normal", weight: 700 });
  }
  if (latin) {
    fonts.push({ name: "VazirmatnLatin", data: latin, style: "normal", weight: 700 });
  }
  return fonts;
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isPersian = toAppLocale(locale) === "fa";
  const fonts = isPersian ? await loadFonts() : [];

  // متن از همان کاتالوگ پیام‌ها می‌آید (قانون ۹: هیچ متن UI سخت‌کد نمی‌شود).
  const t = await getTranslations({ locale, namespace: "metadata" });
  // نشان لاتین برند (نه دامنه): دامنهٔ نهایی هنوز قطعی نیست و ``PUBLIC_SITE_URL``
  // در محیط توسعه ``localhost`` است؛ نشان برند در هر دو زبان یکسان و لاتین است.
  const brandLabel = t("ogBrand");

  const title = t("ogTitle");
  // نکتهٔ کشف‌شده در فاز ۷: موتور ``satori`` نیم‌فاصله (U+200C) را در چیدمان
  // دوجهته اشتباه جابه‌جا می‌کند («نرم‌افزار» ⇒ «افزارنرم»). دو راه‌حل با هم
  // اعمال شده: (۱) متن کوتاه بدون نیم‌فاصله، (۲) حذف تدافعی U+200C از هر متنی
  // که به تصویر می‌رود تا کپی‌های آینده دوباره این مشکل را نسازند.
  const withoutZwnj = (text: string) => text.replace(/\u200c/g, "");
  const subtitle = withoutZwnj(t("ogSubtitle"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "linear-gradient(135deg, #0b1220 0%, #16233c 60%, #1f3556 100%)",
        color: "#f8fafc",
        fontFamily: fonts.length > 0 ? "VazirmatnArabic, VazirmatnLatin" : "sans-serif",
        // satori جهت متن را از استایل می‌گیرد؛ بدون این مقدار، کلمات فارسی
        // در ترتیب LTR چیده می‌شوند و متن به‌هم‌ریخته دیده می‌شود.
        direction: isPersian ? "rtl" : "ltr",
        textAlign: isPersian ? "right" : "left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          flexDirection: isPersian ? "row-reverse" : "row",
          alignSelf: isPersian ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "18px",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "38px",
            fontWeight: 700,
          }}
        >
          E
        </div>
        <div
          style={{
            fontSize: "30px",
            letterSpacing: "0.08em",
            opacity: 0.85,
            fontFamily: "VazirmatnLatin, sans-serif",
            // متن لاتین داخل قالب RTL باید جهت مستقل بگیرد، وگرنه satori
            // آن را تکه‌تکه/بریده رندر می‌کند (مشاهده‌شده در build فاز ۷).
            direction: "ltr",
            textAlign: "left",
          }}
        >
          {brandLabel}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ fontSize: "86px", fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: "34px", opacity: 0.85, lineHeight: 1.5, maxWidth: "900px" }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: "6px",
          width: "220px",
          background: "#3b82f6",
          alignSelf: isPersian ? "flex-end" : "flex-start",
        }}
      />
    </div>,
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
