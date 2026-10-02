# گزارش اجرای فاز ۰ — Platform

**وضعیت:** پایهٔ کد و گیت‌های محلی پیاده‌سازی شده‌اند؛ فاز از نظر خروجی کاملِ قابل استقرار هنوز **تأیید نهایی نشده** است.

## انجام‌شده
- انتقال تاریخچه‌دار (`git mv`) برنامه به `web/` و ایجاد workspace ریشهٔ pnpm؛ آرشیو promptهای طراحی در `docs/references/design-history/`.
- تغییر redirect ریشه به `/fa`؛ metadata اولیه فارسی/RTL؛ حذف ۵ کامپوننت بلااستفاده و dependencyهای MUI/Emotion/Popper و fiber/drei؛ حذف artifact build کهنهٔ `dist/` و تنظیم `@figma/my-make-file` به `@emmett/web`.
- ایجاد feature scaffolds، `lib/jalali.ts`, `lib/toman.ts`, API client، SEO/JSON-LD utilities، alias `@/` و توکن‌ها.
- پیاده‌سازی tier engine `full / balanced / low-power`، SSR-safe مقدار آغازین، respect برای reduced motion، ذخیره و همگام‌سازی کلید Low-Power در Navbar دسکتاپ/موبایل. WebGL فقط lazy و فقط در `full` مجاز است.
- فونت‌های Vazirmatn/Inter/JetBrains Mono/Newsreader اکنون self-host از `@fontsource-variable` هستند؛ وابستگی Google Fonts از مسیر رندر حذف شد.
- گیت parity بر `siteCopy`, page content و UI دوزبانه؛ تست منفی `--self-test` عمداً یک کلید را حذف می‌کند و کشف آن را اثبات می‌کند.
- اسکریپت بودجهٔ JS با آزمون منفی مصنوعی؛ Static Bridge پایه برای ۶ سند fa/en در سه route اصلی، sitemap و robots؛ هشت ADR و اسناد معماری.
- CI تعریف شده برای lint/typecheck/tests/parity/build/budget/SEO/a11y/security.

## شواهد محلی
- `pnpm --filter @emmett/web lint`: پاس.
- `typecheck`: پاس.
- Vitest: **۶ تست پاس** (تاریخ/تومان/tier) پس از ارتقای Vite/React Router.
- `content:check` و self-test عمدی: پاس.
- Production build با Vite 6.4.3: پاس؛ initial JS برابر **۱۲۱٫۸ KB gzip** طبق `bundle-budget`، زیر بودجهٔ ۲۰۰ KB؛ فایل entry شامل runtime سه‌بعدی نیست.
- `budget` و آزمون مصنوعی oversized: پاس.
- Static Bridge: ۶ HTML صفحه + `robots.txt` + `sitemap.xml`؛ `seo:check`: پاس.
- پنج کامپوننت مردهٔ تعیین‌شده حذف شدند. نامشان به‌عنوان کد اجرایی دیگر در importها حضور ندارد.

## مواردی که مانع اعلام «همهٔ گیت‌ها سبز» هستند
- Playwright/axe در این محیط اجرا نشد: دانلود Chromium به علت `ECONNRESET` از `cdn.playwright.dev` ناموفق بود. تست CI برای ۵ route در fa/en وجود دارد ولی هنوز شاهد اجرای سبز ندارد.
- GitHub Actions از این branch در این نوبت اجرا/تأیید نشده است؛ workflow محلی جایگزین اجرای CI واقعی نیست.
- پس از ارتقای Vite به 6.4.3، React Router به 7.18.2 و حذف Puppeteer، `pnpm audit --audit-level high` با کد خروج موفق تمام شد: صفر High/Critical؛ **۲ آسیب‌پذیری Moderate** در dependency tree باقی است و باید پیش از production دوباره بازبینی شود.
- Static Bridge بازاریابی، HTML crawlable تولید می‌کند اما بر اساس Puppeteer prerender خود React app نیست؛ محتوای fallback محدود و copyهای مسیرها hand-maintained است. برای پوشش کامل routeهای واقعی نیازمند کار بعدی است.
- قانون RTL/logical-properties به‌صورت ESLint enforce نشده و تمام legacy JSX strings هنوز از i18n key عبور نمی‌کنند؛ parity gate فعلی سه منبع محتوا را پوشش می‌دهد، نه هر literal در کل JSX.
- بررسی accessibility و ترتیب focus برای screen reader/RTL در مرورگر هنوز تأیید نشده است.
- B1 (دامنهٔ رسمی) و لوگوی SVG در B4 ارائه نشده‌اند؛ canonicalها با path/تنظیم `PUBLIC_SITE_URL` تولید می‌شوند و باید قبل از لانچ با دامنهٔ واقعی پر شوند.

## مبنای فاز بعد
monorepo، tier engine، Jalali/Toman، API client، i18n parity، design tokens، اسکلت Static Bridge و ADRهای 001–008 موجودند. فاز ۱ در sandbox پیاده‌سازی شده؛ موارد انتشار واقعی در گزارش آن ثبت شده‌اند.
