# ADR-0018: انتخاب فونت و بارگذاری خوداستقرار (self-hosted) به‌جای next/font/google

**وضعیت:** پذیرفته‌شده

## زمینه

بریف فاز ۳ دو انتخاب فونت مشخص پیشنهاد کرده بود: فارسی («Vazirmatn یا Estedad») و لاتین («Inter یا Geist»)، به‌علاوه یک ADR برای ثبت انتخاب. بعد از انتخاب اولیه و نوشتن `frontend/src/lib/fonts.ts` با `next/font/google`، در اجرای واقعی `next build` داخل sandbox این خطا رخ داد:

```
Error: next/font: error:
Failed to fetch Inter from Google Fonts.
If you are offline or behind a proxy, self-host the font with next/font/local, ...
```

بررسی شبکه (`curl`) تأیید کرد که `fonts.googleapis.com` در این محیط sandbox در دسترس نیست، اما `registry.npmjs.org` در دسترس است.

## گزینه‌ها برای انتخاب فونت

- **فارسی:** Vazirmatn در برابر Estedad.
- **لاتین:** Inter در برابر Geist.

## گزینه‌ها برای روش بارگذاری (بعد از کشف مشکل شبکه)

1. **ادامه با `next/font/google`:** به اتصال زندهٔ build-time به Google Fonts وابسته می‌ماند — در این sandbox شکست می‌خورد، و حتی در هاست production (مخصوصاً هاست اشتراکی ایرانی که ممکن است به دامنه‌های گوگل دسترسی ناپایدار داشته باشد) ریسک شکست build در هر دیپلوی را به همراه دارد.
2. **`next/font/local` با دانلود دستی فایل‌های woff2 و commit در ریپو:** قابل اعتماد، اما نیاز به دانلود دستی/مدیریت نسخه/لایسنس فایل‌های باینری در Git دارد.
3. **پکیج‌های `@fontsource/*` (فایل‌های واقعی فونت منتشرشده روی npm registry) + `@import` مستقیم در CSS:** قابل‌نصب از طریق `npm install` (که فقط به `registry.npmjs.org` نیاز دارد، نه به CDN فونت گوگل)، شامل فایل‌های `@font-face` با `unicode-range` درست تفکیک‌شده (عربی/فارسی در برابر لاتین)، و به‌طور خودکار در build Next.js با hash نام‌گذاری و کپی به خروجی استاتیک می‌شوند (تأیید شده با بررسی واقعی خروجی `.next/static/chunks/*.css` و `.next/static/media/*.woff2`).

## تصمیم

### انتخاب فونت

- **فارسی: Vazirmatn.** پوشش کامل یونیکد فارسی/عربی + ارقام فارسی بومی (لازم برای قانون ۱۰)، در دسترس به‌صورت پکیج npm رسمی (`@fontsource/vazirmatn`)، و از نظر سبک به دستهٔ «Grotesque Sans» اسپک طراحی نزدیک است.
- **لاتین: Inter.** اسپک طراحی (`emmett-design-spec.md`) دقیقاً Inter را به‌عنوان نمونهٔ خانوادهٔ «Grotesque Sans» نام برده بود؛ پکیج رسمی `@fontsource/inter` موجود است.
- **مونو (برچسب‌های متادیتا/اعداد فنی، بخش B2 اسپک):** JetBrains Mono — پکیج رسمی `@fontsource/jetbrains-mono`.

### روش بارگذاری: گزینهٔ ۳ (`@fontsource` + `@import`)

`frontend/src/app/globals.css` این importها را مستقیماً در ابتدای فایل دارد (قبل از بلوک توکن‌های رنگ):

```css
@import "tailwindcss";
@import "@fontsource/vazirmatn/400.css";
@import "@fontsource/vazirmatn/500.css";
@import "@fontsource/vazirmatn/600.css";
@import "@fontsource/vazirmatn/700.css";
@import "@fontsource/inter/400.css";
/* ... و وزن‌های مشابه برای Inter/JetBrains Mono */
```

`frontend/src/lib/fonts.ts` دیگر هیچ تابع `next/font` فراخوانی نمی‌کند؛ فقط نام خانوادهٔ فونت را به‌صورت ثابت export می‌کند (`FONT_FAMILY_FA`, `FONT_FAMILY_EN`, `FONT_FAMILY_MONO`) که مستقیماً به‌عنوان مرجع مستندسازی/آینده استفاده می‌شود. مقدار واقعی CSS در `globals.css`:

```css
--font-fa: "Vazirmatn", ui-sans-serif, system-ui, sans-serif;
--font-en: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-technical-raw: "JetBrains Mono";
```

سوئیچ فعال بین `--font-fa`/`--font-en` بر اساس locale در `app/[locale]/layout.tsx` با یک inline style روی `<html>` انجام می‌شود (`--font-active-sans: var(--font-fa)` یا `var(--font-en)`؛ ر.ک. ADR-0016).

## دلیل

- گزینهٔ ۳ کاملاً وابستگی build-time به شبکهٔ خارجی را حذف می‌کند — فایل‌های فونت فقط یک‌بار هنگام `npm install` از npm registry دریافت می‌شوند (دقیقاً مثل هر وابستگی دیگر پروژه)، و از آن به بعد `next build` کاملاً آفلاین کار می‌کند. این برای یک پروژه که قرار است روی هاست اشتراکی (نه زیرساخت ابری با تضمین شبکهٔ پایدار به دامنه‌های Google) دیپلوی شود، قابلیت اطمینان بسیار بالاتری نسبت به `next/font/google` دارد.
- در برابر گزینهٔ ۲ (دانلود دستی woff2)، `@fontsource` مدیریت نسخه/لایسنس/subsetting را از طریق npm anima می‌کند؛ کافی‌ست نسخهٔ پکیج در `package.json` پین شود.
- فایل‌های `@fontsource` با `font-display: swap` از پیش تنظیم شده‌اند (جلوگیری از متن نامرئی حین بارگذاری فونت)، که با الزامات Lighthouse/CLS (قانون ۱۹) همسو است.

## پیامدها

- در برابر `next/font/google`/`next/font/local`، این روش preload/inlining خودکار Next.js (که به‌صورت built-in برای فونت‌های مدیریت‌شده با `next/font` فراهم می‌شود) را ندارد؛ در صورت نیاز به بهینه‌سازی بیشتر LCP در فازهای بعد، می‌توان `<link rel="preload">` دستی برای وزن‌های بحرانی (۴۰۰/۵۰۰ فارسی و لاتین) به `<head>` layout اضافه کرد — این بهینه‌سازی در scope فاز ۳ نبود و باید به فاز Performance/SEO ارجاع داده شود.
- هر وزن فونت جدیدی که در فازهای بعد لازم شود باید با یک `@import` جدید از همان پکیج `@fontsource` اضافه شود، نه با دانلود فایل جداگانه.
- این الگو (پکیج `@fontsource` npm + `@import` مستقیم، بدون `next/font`) باید برای هر فونت جدیدی که فازهای بعد اضافه می‌کنند تکرار شود، مگر این‌که محدودیت شبکهٔ sandbox رفع شده باشد و تیم آگاهانه به `next/font/google` بازگردد.
