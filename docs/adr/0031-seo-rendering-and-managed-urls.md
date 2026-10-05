# ADR-0031: معماری SEO — رندر در Next.js، دادهٔ ادمین از Django، دامنه از env

**وضعیت:** پذیرفته‌شده — واگذاری کامل مالک محصول در 2026-10-05 (پاسخ ۱: «بله» به رندر SEO در Next.js؛ پاسخ ۲: «دامنه هنوز قطعی مشخص نشده»؛ پاسخ ۶: «روی همهٔ بخش‌ها JSON-LD»)<br>
**تاریخ:** 2026-10-05<br>
**دامنه:** فاز ۷ (SEO)<br>
**مرتبط با:** ADR-0003, 0004, 0014, 0016, 0027, 0030<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

قانون ۱۷ پروژه (SEO) فهرستی صریح دارد: sitemap، robots، hreflang، JSON-LD، OG/Twitter،
canonical، متای پویا و RSS. تا فاز ۶ هیچ‌کدام از این‌ها وجود نداشت و تنها منبع متادیتا،
چند `generateMetadata` دستی و پراکنده در فرانت‌اند بود. سه پرسش معماری باقی بود:

1. **کدام لایه این خروجی‌ها را تولید کند؟** سایت دوزبانه با Next.js SSR سرو می‌شود
   (ADR-0016) و Django فقط API/ادمین است؛ اگر SEO در Django ساخته شود، دو منبع حقیقت
   برای URL و مسیر (یکی در Next، یکی در Django) ایجاد می‌شود.
2. **دامنهٔ canonical از کجا بیاید؟** دامنهٔ نهایی در زمان توسعه مشخص نبود؛ hard-code
   کردن آن یعنی همهٔ URLهای مطلق در staging/تولید اشتباه شوند.
3. **محتوای SEO ادمین‌محور (meta پیش‌فرض، FAQ، ریدایرکت، کد تأیید GSC) کجا نگه‌داری شود؟**
   مدیر محتوا باید بدون تغییر کد بتواند این‌ها را ویرایش کند (قانون ۴ در عمل).

## ۲. گزینه‌ها

| گزینه | مزیت | وضعیت |
|---|---|---|
| A. تولید کامل SEO در Django (sitemap.xml/robots.txt به‌صورت view جنگو) | یک‌جا، آشنای تیم بک‌اند | رد: دو منبع حقیقت برای URLهای محتوایی؛ مرزهای Next (SSR/ISR و کش) دور زده می‌شود؛ hreflang باید از پیشوند `/en` در Next آگاه باشد |
| B. تولید کامل SEO در Next.js (sitemap/robots/hreflang/JSON-LD/OG/canonical/فید) با داده از API ادمین | یک منبع حقیقت، هم‌جنس با رندر، کش لبه‌ای | **انتخاب‌شده** |
| C. سرویس خارجی SEO (SaaS) | کم‌کد | رد: وابستگی غیرضروری + داده روی سرور خارجی (قانون ۶ و ۱۶) |

## ۳. تصمیم

1. **همهٔ خروجی‌های SEO در لایهٔ Next.js ساخته می‌شوند** (پاسخ ۱ مالک محصول):
   `src/app/sitemap.ts`، `src/app/robots.ts`، `[locale]/opengraph-image.tsx`،
   `[locale]/{blog,academy}/rss/route.ts` و `src/lib/seo/*` (توابع خالص + تست).
   Django فقط **منبع داده** است: `/api/v1/seo/settings|sitemap|redirects/` و
   `/seo/faq/?path=…` با کش (`SEO_SITEMAP_CACHE_SECONDS`، `SEO_REDIRECTS_CACHE_SECONDS`).
   فید جنگو (`/api/v1/blog/rss/`) به‌عنوان مسیر سازگاری حفظ می‌شود (پاسخ ۷ مالک محصول).
2. **`PUBLIC_SITE_URL` تنها منبع حقیقت دامنه است** (پاسخ ۲): نه hard-code، نه هدر `Host`
   (قابل جعل). `src/lib/seo/site.ts` همهٔ URLهای مطلق را از آن می‌سازد و در نبود مقدار،
   `http://localhost:3000` استفاده می‌شود. `core.checks` در حالت `--deploy` نبود/بی‌اعتباری
   آن را خطا می‌گیرد (W007).
3. **hreflang و canonical از یک تابع واحد** (`localePath`/`alternatesFor`) می‌آیند:
   فارسی بدون پیشوند، انگلیسی زیر `/en` (ADR-0004)، `fa-IR`/`en`/`x-default`، و canonical
   همیشه خودارجاع.
4. **JSON-LD شش‌نوعه روی همهٔ صفحات عمومی** (پاسخ ۶): `Organization`+`WebSite` در ریشه،
   `Article` (بلاگ/پروژه)، `Course`، `Service`، `BreadcrumbList` و `FAQPage` — همه از یک
   کامپوننت سروری `JsonLd` با `application/ld+json` تزریق می‌شوند و با تست قفل شده‌اند.
5. **مسیرهای noindex در یک لیست واحد** تعریف می‌شوند (`SEO_NOINDEX_PATHS` در بک‌اند و
   همان لیست در `robots.ts`) و از sitemap حذف می‌شوند: `/profile`, `/search`, `/advisor`,
   `/estimate`, `/admin`, `/api`, `/i18n`, `/media`. robots همچنین
   `/admin`, `/api`, `/profile`, `/search`, `/advisor/results/*` را Disallow و sitemap را
   اعلام می‌کند.
6. **ریدایرکت‌های مدیریت‌شده (۳۰۱/۳۰۲/۴۱۰) از ادمین و در لبهٔ Next اعمال می‌شوند**:
   `src/proxy.ts` ابتدا نگاشت را می‌خواند (کش‌شده در Django)، برای ۴۱۰ صفحهٔ HTML با
   `X-Robots-Tag: noindex` برمی‌گرداند و برای بقیه `Location` می‌دهد. در Django هم
   `RedirectFallbackMiddleware` همان نگاشت را برای مسیرهای ۴۰۴ ادمین/API اعمال می‌کند.
   نرمال‌سازی کلید در دو طرف یکسان است (`normalize_redirect_path` و `normalizePath`).
7. **کد تأیید Google Search Console از ادمین/env** خوانده می‌شود (پاسخ ۳): فیلد در
   `SiteSettings` و در نبودش `SEO_GOOGLE_SITE_VERIFICATION`؛ متای مربوطه در فرانت تزریق
   می‌شود و در production بودنِ مقدار با System Check بررسی می‌شود.

## ۴. پیامدها

- **مثبت:** یک منبع حقیقت برای URL؛ کش لایه‌ای (Map در Next + cache در Django)؛ محتوای SEO
  بدون deploy قابل ویرایش؛ مسیر مهاجرت دامنه فقط تغییر یک env var.
- **منفی/ریسک:** sitemap و robots چون به API وابسته‌اند **نمی‌توانند در build استاتیک شوند**؛
  با `dynamic = "force-dynamic"` در هر درخواست ساخته می‌شوند (هزینهٔ آن یک fetch کش‌شده است).
  تست `TestPublicAssetHints` تضمین می‌کند build بدون بک‌اند هم شکست نخورد.
- صفحاتی که محتوایشان در CMS نیست (مثل `/design-system`) از sitemap با اولویت `0.2`
  می‌آیند تا نویز ایندکس نسازند.

## ۵. اعتبارسنجی

- `frontend/src/lib/seo/{site,json-ld,metadata,redirects}.test.ts` — ۴۲ تست (hreflang،
  canonical، OG/Twitter، شش نوع JSON-LD، نرمال‌سازی ریدایرکت).
- `backend/apps/core/tests/{test_seo_api,test_redirects,test_feeds}.py` — ۴۸ تست
  (شمارش کوئری، اعتبار payload، بدون noindex در sitemap، شمارش hit).
- `backend/apps/core/tests/test_performance_budget.py` — سقف کوئری هر endpoint.
