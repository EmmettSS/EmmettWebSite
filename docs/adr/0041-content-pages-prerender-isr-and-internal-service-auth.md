# ADR-0041: رندر استاتیک/ISR صفحه‌های محتوایی، حذف فراخوانی per-request در proxy، و احراز هویت سرویس داخلی

**وضعیت:** پذیرفته‌شده — بازرسی عمیق معماری به درخواست مالک محصول، پس از گزارش «کندی شدید،
شروع از فرانت‌اند، و مستندات غیرقابل‌اعتماد» (2026-10-31)<br>
**تاریخ:** 2026-10-31<br>
**دامنه:** `frontend/src/app/[locale]/layout.tsx`، `frontend/src/proxy.ts`،
`frontend/src/components/seo/json-ld.tsx`، `frontend/src/lib/api/{config,server,seo,redirect-cache}.ts`،
`frontend/src/i18n/request.ts`، `frontend/src/lib/seo/feed.ts`،
`frontend/src/app/{sitemap,robots}.ts`، `frontend/src/components/ui-port/loader.tsx`،
`frontend/scripts/verify-rendering.mjs`، `backend/apps/core/throttling.py`،
`backend/config/settings/base.py`، `.github/workflows/ci.yml`، `.gitattributes`<br>
**مرتبط با:** ADR-0001 (معماری کلان Next.js + Django)، ADR-0031 (رندر و URLهای مدیریت‌شده)،
ADR-0032 (بودجهٔ کارایی)، ADR-0035 (توپولوژی استقرار cPanel)، ADR-0038 (CI)<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

مالک محصول گزارش کرد که این پروژه، برخلاف پروژه‌های قبلی (Django-template و Vite+React)،
«کند است، از فرانت‌اند استارت می‌شود و مستنداتش واقعی و تست‌شده نیست». بازرسی اندازه‌گیری‌شده
(گزارش کامل: [`docs/audit/2026-10-31-deep-audit.fa.md`](../audit/2026-10-31-deep-audit.fa.md))
پنج ریشهٔ مشخص را نشان داد؛ سه‌تای اول موضوع این ADR است:

### ۱-۱. اندازه‌گیری پیش از تصمیم

| سنجه | مقدار |
|---|---|
| مسیرهای `ƒ Dynamic` در خروجی `next build` | ۲۵ از ۲۵ |
| مسیرهای ISR/pre-render | ۰ |
| TTFB `/` (۳۰ درخواست متوالی، production build) | میانگین ۶۲٫۷ms، p95 ۷۲٫۳ms |
| TTFB `/` با ۱۰ کلاینت هم‌زمان | میانگین ۱۶۲٫۸ms، p95 ۱۷۰٫۷ms |
| TTFB `/blog/{slug}` (مسیر بدون `generateStaticParams`) | میانگین ۱۰۵٫۲ms |
| اولین درخواست پس از استارت سرد سرور | ۴۳۳ms |
| فراخوانی `GET /api/v1/seo/redirects/` | **یک به‌ازای هر بازدید صفحه** (از لاگ Django) |
| پاسخ API بک‌اند روی همان ماشین | ۴–۱۹ms |

یعنی بک‌اند سریع بود و هزینه، تماماً در لایهٔ Next تولید می‌شد.

### ۱-۲. علت دقیق

1. `await connection()` در `src/app/[locale]/layout.tsx` به‌همراه CSP مبتنی بر nonce در
   `src/proxy.ts` و `headers()` در `components/seo/json-ld.tsx`. Next.js برای nonce
   به‌ازای هر درخواست، مسیر را **واجبار داینامیک** می‌کند؛ چون این‌ها در layout ریشه بودند،
   به همهٔ صفحات ارث می‌رسیدند. نتیجه: زیرساخت ISR پروژه (وب‌هوک `/api/revalidate`،
   `cache-tags.ts`، `frontend_cache.py`) کامل بی‌اثر بود.
2. `getSeoRedirects()` در `proxy.ts`. گزینهٔ `next.revalidate` در لایهٔ middleware/proxy
   **پشتیبانی نمی‌شود** (Data Cache در آن لایه نیست)؛ پس هر درخواست یک fetch تازه می‌زد.
3. throttle پیش‌فرض DRF (`anon = 100/hour`) همهٔ فراخوانی‌های SSR/ISR از `127.0.0.1` را در
   یک سطل مشترک می‌انداخت. بعد از ۱۰۰ رندر در ساعت، پاسخ `429` و — چون `serverFetch` خطا را
   می‌بلعد — صفحه **بی‌صدا خالی** می‌شد. این در بازرسی بازتولید شد (HTML صفحهٔ اصلی از
   ۱۰۴KB به ۷۲KB کاهش یافت، بدون هیچ خطای کاربری).

## ۲. تصمیم

1. **صفحه‌های محتوایی عمومی pre-render می‌شوند و با ISR (`revalidate = 60` از
   `serverFetch`) تازه می‌شوند.** برای رسیدن به این حالت، `connection()` حذف می‌شود و
   `JsonLd` دیگر `headers()` نمی‌خواند.
2. **CSP از nonce به سیاست ثابت تغییر می‌کند**: `script-src 'self' 'unsafe-inline'` به‌همراه
   `default-src 'self'`، `object-src 'none'`، `base-uri 'self'`، `form-action 'self'`.
3. **`proxy.ts` هرگز روی مسیر درخواست، به بک‌اند نمی‌زند.** ریدایرکت‌های مدیریت‌شده از یک کش
   درون‌حافظه‌ای (`src/lib/api/redirect-cache.ts`) با TTL ۶۰ ثانیه، stale-while-revalidate و
   backoff منفی ۳۰ ثانیه خوانده می‌شوند.
4. **فراخوانی‌های سرور-به-سرور با توکن سرویس داخلی احراز هویت می‌شوند**: هدر
   `X-Internal-Token` برابر `INTERNAL_API_TOKEN` (فقط سمت سرور، مقایسه با
   `secrets.compare_digest`) throttleهای **پیش‌فرض** anon/user را معاف می‌کند. throttleهای
   کاربری (`contact_form`، `ai_engine`، `auth`، `newsletter`) **هرگز** معاف نمی‌شوند.
5. **`sitemap.xml` و `robots.txt` از `force-dynamic` به `revalidate = 900`** تغییر می‌کنند.
6. **Loader از انتظار برای `window.load` رها می‌شود** و سقف ۷۵۰ms دارد.
7. **صفحه‌های جزئیات (`[slug]`) هم pre-render می‌شوند.** `src/lib/api/static-params.ts`
   فهرست slugها را در زمان بیلد از API می‌گیرد و چهار مسیر `blog`/`services`/`projects`/
   `academy` با `generateStaticParams` + `revalidate = 60` و `dynamicParams` پیش‌فرض
   ساخته می‌شوند. اگر بک‌اند در زمان بیلد بالا نباشد، فهرست خالی است و صفحه در نخستین
   درخواست رندر و کش می‌شود — بیلد هرگز به‌خاطر خاموش‌بودن API شکست نمی‌خورد.
8. **یک گارد اجرایی اضافه می‌شود** (`npm run verify:rendering`) که پس از هر بیلد بررسی می‌کند
   مسیرهای محتوایی واقعاً pre-render شده‌اند؛ این ادعا دیگر فقط متن نیست.

## ۳. پیامدها

### مثبت (اندازه‌گیری‌شده)

| سنجه | قبل | بعد |
|---|---|---|
| TTFB `/` متوالی | ۶۲٫۷ms | **۲٫۶ms** |
| TTFB `/` با ۱۰ کلاینت هم‌زمان | ۱۶۲٫۸ms | **۴٫۸ms** |
| TTFB `/blog/{slug}` | ۱۰۵٫۲ms | **۲٫۵ms** |
| اولین درخواست پس از استارت سرد | ۴۳۳ms | **۲۳۱ms** |
| مسیرهای pre-render | ۰ | **۶۱** (۲۶ صفحهٔ جزئیات محتوایی در میان آن‌ها) |
| فراخوانی بک‌اند در هر بازدید | ۱ + N | ۰ |

### منفی / مصالحه‌ها

- **کاهش سختی CSP در صفحه‌های عمومی.** `'unsafe-inline'` یعنی هر XSS درون‌خطی اجرا
  می‌شود. کاهش ریسک: هیچ HTML کاربری در خروجی اولیه نیست و HTML غنی CMS با `nh3` و
  `sanitize-html` پاک‌سازی می‌شود؛ اسکریپت خارجی همچنان ممنوع است. گزینهٔ جایگزینِ امن‌تر
  (CSP ثابت برای مسیرهای عمومی + CSP با nonce برای `/profile`، `/search`،
  `/advisor/results/*`) به‌عنوان گزینهٔ آینده ثبت می‌شود.
- **بیلد به بک‌اند زنده وابسته شد.** اگر بک‌اند در زمان `next build` بالا نباشد، صفحه‌ها با
  دادهٔ پیش‌فرض ساخته می‌شوند و نخستین revalidate آن‌ها را ترمیم می‌کند. برای همین، جاب
  `frontend-test-build` در CI حالا Django را قبل از بیلد بالا می‌آورد و هشدار
  `[build] backend unreachable during prerender` در لاگ ثبت می‌شود.
- **تازگی محتوا تا ۶۰ ثانیه تأخیر دارد** مگر اینکه وب‌هوک revalidate از Django فراخوانی شود
  (که در `frontend_cache.py` پیاده شده است).
- **صفحهٔ جزئیاتِ تازه‌منتشرشده** (پس از بیلد) در نخستین بازدید رندر و کش می‌شود؛ یعنی یک
  بازدید کند (در اندازه‌گیری: ~۴۰ms) به‌ازای هر slug جدید، سپس بازدیدهای بعدی از کش. وب‌هوک
  revalidate می‌تواند این را حذف کند اگر در انتشار محتوا فراخوانی شود.
- **کش ریدایرکت‌ها درون‌حافظه‌ای است**؛ در محیط چندپروسه‌ای، هر پروسه کش خودش را دارد و
  حداکثر ۶۰ ثانیه ناهمگام می‌شود. برای ریدایرکت SEO بی‌ضرر است.

## ۴. گزینه‌های بررسی‌شده و رد‌شده

| گزینه | چرا رد شد |
|---|---|
| بازنویسی کامل روی Vite + React SPA (همان الگوی پروژه‌های قبلی) | SEO بلاگ/خدمات/محصول از دست می‌رفت (~۱۴هزار خط بازنویسی + از دست دادن SSR)؛ مشکل، Next.js نبود، پیکربندی بود |
| بازنویسی روی Django template + HTMX (الگوی PenTestor) | یک runtime و سریع‌ترین گزینه، اما دور ریختن کل دیزاین‌سیستم و انیمیشن‌ها؛ به‌عنوان مسیر اضطراری باز است |
| نگه‌داشتن nonce و پذیرش رندر داینامیک + کش لبهٔ CDN | نیازمند CDN بیرونی و پیکربندی خارج از مخزن؛ روی cPanel اشتراکی قابل اتکا نیست |
| کش ریدایرکت‌ها با `unstable_cache` در proxy | در runtime میان‌افزار در دسترس نیست |
| حذف کامل ریدایرکت‌های مدیریت‌شده از proxy | قابلیت ADR-0031 را حذف می‌کرد |

## ۵. قواعد اجرایی (برای آیندهٔ این ریپو)

1. **هیچ `headers()`/`cookies()`/`connection()`/`searchParams` در layout یا صفحهٔ عمومی
   اضافه نشود** مگر با دلیل مستند؛ `npm run verify:rendering` جلوی رگرسیون را می‌گیرد.
2. **هیچ fetchی در `proxy.ts` اضافه نشود.** هر دادهٔ موردنیاز میان‌افزار باید از کش
   درون‌حافظه‌ای با TTL و backoff بیاید.
3. **هر ادعای مستندات دربارهٔ کارایی/رندر باید یک اسکریپت یا تست داشته باشد.** ادعای بدون
   گارد، در این پروژه ثابت شد که می‌پوسد.
4. **هر فراخوانی سرور-به-سرور باید `internalServiceHeaders()` را بفرستد.**

## ۶. مأخذ

- گزارش بازرسی: [`docs/audit/2026-10-31-deep-audit.fa.md`](../audit/2026-10-31-deep-audit.fa.md)
- گارد رندر: `frontend/scripts/verify-rendering.mjs`
- تست کش: `frontend/src/lib/api/redirect-cache.test.ts`
- تست throttle: `backend/apps/core/tests/test_throttling.py::TestInternalServiceBypass`
