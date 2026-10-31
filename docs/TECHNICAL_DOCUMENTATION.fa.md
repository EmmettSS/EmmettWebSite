# مستندات فنی جامع پروژهٔ امیت (Emmett Software Development Group) — نسخهٔ فارسی

> **نوع سند:** مرجع فنی یکپارچه و جامع (Single-File Technical Documentation — فارسی)  
> **نسخهٔ انگلیسی:** [`docs/TECHNICAL_DOCUMENTATION.en.md`](./TECHNICAL_DOCUMENTATION.en.md)  
> **پوشش:** معماری سیستم، مدل داده، خلاصهٔ هر ۴۰ ADR، مستندات کامل API، راهنمای کامل پنل ادمین، راهنمای گام‌به‌گام استقرار روی cPanel، و دروازه‌های کیفیت/CI-CD.

---

## فهرست مطالب

1. [بخش اول: معماری کلان سیستم و مدل داده](#بخش-اول-معماری-کلان-سیستم-و-مدل-داده)
2. [بخش دوم: فهرست و خلاصهٔ تصمیمات معماری (ADR-0001 تا ADR-0040)](#بخش-دوم-فهرست-و-خلاصهٔ-تصمیمات-معماری-adr-0001-تا-adr-0040)
3. [بخش سوم: مستندات کامل API (OpenAPI / REST v1)](#بخش-سوم-مستندات-کامل-api-openapi--rest-v1)
4. [بخش چهارم: راهنمای جامع پنل مدیریت (Admin Guide)](#بخش-چهارم-راهنمای-جامع-پنل-مدیریت-admin-guide)
5. [بخش پنجم: راهنمای گام‌به‌گام استقرار روی هاست اشتراکی cPanel](#بخش-پنجم-راهنمای-گام‌به‌گام-استقرار-روی-هاست-اشتراکی-cpanel)
6. [بخش ششم: دروازه‌های کیفیت، تست، Pre-commit و پایپ‌لاین CI/CD](#بخش-ششم-دروازه‌های-کیفیت-تست-pre-commit-و-پایپ‌لاین-cicd)

### تقارنِ فارسی/انگلیسی — نگاشتِ بخش‌ها

این دو فایل **آینهٔ کاربردی** یکدیگرند، نه آینهٔ سطر‌به‌سطر. قاعدهٔ بستهٔ ۷ این بود:
هر محتوایی که خواننده برای **عمل کردن** لازم دارد باید در هر دو زبان باشد؛ ولی
شماره‌گذاریِ زیربخش‌ها الزاماً یکی نیست، چون نسخهٔ انگلیسی چند بخشِ فارسی را در یک
زیربخش ادغام کرده است. این جدول تنها تفاوت‌های باقی‌مانده را ثبت می‌کند — هرچه اینجا
نیامده، در دو زبان هم‌شماره و هم‌محتواست.

| فارسی | انگلیسی | تفاوت |
|---|---|---|
| ۴.۵. مدیریت موتور AI در ادمین | 4.5. AI Catalogs, Prompts, Summaries & Data Import/Export | انگلیسی بخش‌های ۴.۵ و ۴.۶ فارسی را ادغام کرده |
| ۴.۶. صادرات و واردات داده | (داخل 4.5) | محتوایش هست، شمارهٔ جدا ندارد |
| ۴.۷. 2FA و مدیریت سئو در ادمین | 4.6 (2FA) + 4.7 (SEO) | فارسی دو موضوع را در یک بخش دارد؛ انگلیسی جدا کرده |
| ۴.۸. مرجع کدهای `System Checks` | (داخل 4.6) | محتوایش هست، شمارهٔ جدا ندارد |
| ۵.۱ تا ۵.۷ | 5.1 to 5.7 | ✅ **یکسان** — از بستهٔ ۷ به بعد |
| ۶.۲. هوک‌های Pre-commit | 6.2. Pre-commit Hooks & GitHub Actions Pipeline | انگلیسی بخش‌های ۶.۲ و ۶.۳ فارسی را ادغام کرده |
| ۶.۳. پایپ‌لاین GitHub Actions | (داخل 6.2) | محتوایش هست، شمارهٔ جدا ندارد |
| ۶.۴. پوشش تست: دامنهٔ واقعی اندازه‌گیری | 6.3. Test Coverage: Actual Measured Scope | همان محتوا با **شمارهٔ متفاوت** — این تنها جابه‌جاییِ شماره‌ای است که در ارجاع‌های متقابل دیده می‌شود |

محتوایی که **فقط در یک زبان** باشد دیگر وجود ندارد: پیش‌نیازهای هاست (۵.۱)، چک‌لیست
پس از استقرار (۵.۷) و مدیریت سئوی ادمین (۴.۷) در بستهٔ ۷ به نسخهٔ انگلیسی اضافه
شدند.

---

## بخش اول: معماری کلان سیستم و مدل داده

### ۱.۱. نمای کلی معماری (Next.js SSR + Django Modular Monolith)

پروژهٔ وب‌سایت گروه توسعه نرم‌افزار امیت به‌صورت یک **مونو-ریپو (Monorepo)** طراحی شده است که شامل دو لایهٔ اجرایی مجزا ولی هم‌افزا است (`ADR-0001`):

```
┌────────────────────────────────────┐        HTTPS / JSON        ┌────────────────────────────────────┐
│   Next.js 16 (SSR) Frontend        │ ─────────────────────────▶ │   Django 5.2 + DRF API (/api/v1/)  │
│   مسیر: frontend/                  │ ◀───────────────────────── │   مسیر: backend/                   │
│   - زبان پیش‌فرض فارسی (/)         │   Server-to-Server + Proxy │   - ۱۱ اپ Modular Monolith         │
│   - زبان انگلیسی (/en)             │                            │   - موتور مرکزی ai_engine          │
│   - سئو، JSON-LD، OG، Sitemap/RSS  │                            │   - پنل ادمین SaaS (Jazzmin + RTL) │
└────────────────────────────────────┘                            └─────────────────┬──────────────────┘
                                                                                    │
                                                                      ┌─────────────┴─────────────┐
                                                                      │ SQLite 3 (محیط توسعه/تست) │
                                                                      │ MySQL 8 (محیط پروداکشن)   │
                                                                      └───────────────────────────┘
```

- **چرا مونو-ریپو؟** همگام‌سازی تایپ‌های API، اشتراک پایپ‌لاین CI/CD، Pre-commit واحد و ردیابی اتمیک تغییرات فرانت و بک‌اند در یک Pull Request.
- **الگوی اتصال فرانت به بک‌اند:**
  - **Server Components:** مستقیم از سمت سرور Next به `INTERNAL_API_URL` درخواست می‌زنند؛ در توسعه `http://127.0.0.1:8000` و در cPanel `https://<canonical-host>/backend` (mount اپ Python Passenger) است. ر.ک. ADR-0035.
  - **Client Components:** همیشه به مسیر نسبی هم‌مبدأ `/api/v1/...` درخواست می‌فرستند که توسط Route Handler سمت سرور (`frontend/src/app/api/[...path]/route.ts`) با حفظ دقیق اسلش پایانی و کوکی‌های `csrftoken`/`sessionid` به بک‌اند Django پراکسی می‌شود.

### ۱.۲. مرزبندی اپ‌های بک‌اند (`backend/apps/`)

بک‌اند یک **Modular Monolith** است (`ADR-0002`) که از ۱۱ اپ تشکیل شده است:

| اپ | مسئولیت دامنه | مدل‌های اصلی |
|---|---|---|
| `core` | زیرساخت مشترک، نرم‌حذف، رسانه، ترجمهٔ پویا، لاگ ممیزی، جست‌وجوی تمام‌متن (FTS)، سئو، امنیت و داشبورد ادمین | `SiteSettings`, `Media`, `Translation`, `AuditLog`, `SearchIndexEntry`, `Redirect`, `FAQItem` |
| `accounts` | کاربر سفارشی ایمیل‌محور، پروفایل، علاقه‌مندی‌ها، احراز هویت Session/CSRF و 2FA ادمین (TOTP + کد بازیابی) | `User`, `Profile`, `Favorite` (+ جداول `django_otp`) |
| `taxonomy` | دسته‌بندی سلسله‌مراتبی و برچسب‌های مشترک بین اپ‌های محتوایی | `Category`, `Tag` |
| `company` | اعضای تیم و نظرات مشتریان (صفحهٔ دربارهٔ ما) | `TeamMember`, `Testimonial` |
| `services` | معرفی خدمات مهندسی نرم‌افزار | `Service` |
| `portfolio` | نمونه‌کارها، محصولات (`is_product=True`) و مطالعات موردی ۷بخشی. در دادهٔ نمونه فقط **`pentestor`** محصول است؛ CRM هیچ رکوردی در دیتابیس ندارد و صفحهٔ `/products/crm` یک «به‌زودی» زنده است (`ADR-0040`) | `Project`, `CaseStudy` |
| `academy` | مدرسان، دوره‌های آموزشی، سرفصل درس‌ها و ثبت‌نام دانشجویان | `Instructor`, `Course`, `Lesson`, `Enrollment` |
| `blog` | مقالات کتابخانه، نظرات چندسطحی با تأیید ادمین و فید RSS | `BlogPost`, `Comment` |
| `leads` | فرم تماس، پایپ‌لاین فروش (CRM) متصل به پیشنهاد AI، عضویت خبرنامه و آداپتور پیامک کاوه‌نگار | `Contact`, `Lead`, `Newsletter` |
| `ai_engine` | درگاه مرکزی هوش مصنوعی، کاتالوگ‌های Enum دیتابیسی، پرامپت‌های نسخه‌دار، Guardrail فرهنگی ایرانی، مشاور ایده‌پرداز، تخمین‌گر زمانی و خلاصه‌ساز مقالات | `Catalog`, `CatalogOption`, `PromptTemplate`, `GuardrailRule`, `EstimationRule`, `AIRequest`, `AISuggestion`, `AIConcept`, `AIContentArtifact` |
| `api` | لایهٔ ترکیب روترهای `/api/v1/` و تولید اسکیمای OpenAPI (`drf-spectacular`) | بدون مدل |

### ۱.۳. بین‌المللی‌سازی (i18n)، تقویم جلالی/میلادی و RTL/LTR

1. **معماری سه‌لایهٔ ترجمه (`ADR-0003`, `ADR-0030`):**
   - **لایهٔ ۱ (رشته‌های ثابت کد):** در بک‌اند با `gettext` (`backend/locale/{fa,en}/LC_MESSAGES/django.po`) و ابزار خالص پایتون `python scripts/i18n.py {extract,compile,check,stats}`؛ در فرانت‌اند با `next-intl` و فایل‌های متقارن `frontend/messages/{fa,en}.json`.
   - **لایهٔ ۲ (محتوای دیتابیسی):** با `django-modeltranslation` که فیلدهای ترجمه‌پذیر را به ستون‌های `*_fa` و `*_en` تبدیل می‌کند.
   - **لایهٔ ۳ (رشته‌های پویای ادمین):** مدل `core.Translation` با کلید یکتای `(namespace, key, locale)` و کش خودکار.
2. **تاریخ و اعداد (`ADR-0004`, `ADR-0019`):**
   - ذخیره‌سازی در دیتابیس منحصراً به صورت UTC میلادی است.
   - نمایش در زبان فارسی به صورت **تقویم شمسی (جلالی)** با ارقام فارسی (`۰۱۲۳۴۵۶۷۸۹`) از طریق `apps/core/utils/dates.py` (`jdatetime`) در بک‌اند و `frontend/src/lib/format/date.ts` (`dayjs` + `jalaliday`) در فرانت‌اند انجام می‌شود.
   - نمایش در زبان انگلیسی به صورت **تقویم میلادی** با ارقام لاتین است.
3. **مدیریت RTL/LTR (` قـانون ۱۱`):**
   - جهت صفحه (`dir="rtl"` برای فارسی و `dir="ltr"` برای انگلیسی) در `app/[locale]/layout.tsx` و در سطح کامپوننت‌ها (مانند جهت آیکون در `Breadcrumb`) و کلاس‌های منطقی Tailwind (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) مدیریت می‌شود، نه با CSS hack.

### ۱.۴. معماری موتور هوش مصنوعی (`ai_engine` — قوانین ۱۲، ۱۳ و ۱۴)

- **انحصار فراخوانی (قانون ۱۲):** هیچ اپی اجازهٔ تماس مستقیم با مدل زبانی را ندارد؛ تمام درخواست‌ها فقط از `apps.ai_engine` و اینترفیس `AIProvider` (`OpenAICompatibleProvider`) عبور می‌کنند.
- **ورودی بستهٔ Enum (قانون ۱۳):** مشاور ایده‌پرداز (`/api/v1/ai/advisor/`) و تخمین‌گر زمانی (`/api/v1/ai/estimates/`) فقط کلیدهای فعال موجود در جدول `CatalogOption` (`job_role`, `business_size`, `city_scale`, `budget_range`, `team_size`, `goal`, `delivery_scope`) را می‌پذیرند و هیچ متن آزادی (free-text) از کاربر به مدل ارسال نمی‌شود.
- **Guardrail فرهنگی ایرانی (قانون ۱۴):** ماژول `apps/ai_engine/guardrails/service.py` قواعد فعال جدول `GuardrailRule` را پیش و پس از تولید متن بررسی می‌کند و خروجی‌های ناقض هنجارهای فرهنگی، قانونی یا حرفه‌ای ایران را مسدود (`AIOutputBlocked`) و در `AIRequest` ثبت می‌کند.
- **حریم خصوصی:** در جدول ممیزی `AIRequest` هیچ آدرس IP، رشتهٔ `User-Agent` یا اطلاعات تماسی ذخیره نمی‌شود؛ شناسهٔ درخواست‌کننده صرفاً یک HMAC یک‌طرفه است و با فرمان `purge_ai_audit` پس از ۳۶۵ روز هرس می‌شود.

---

## بخش دوم: فهرست و خلاصهٔ تصمیمات معماری (ADR-0001 تا ADR-0040)

تمام تصمیمات معماری در مسیر `docs/adr/` مستند شده‌اند. **فهرست کامل و معتبر هر ۴۰ ADR — به‌همراه ارجاع‌های مردهٔ شناخته‌شده و یادداشت‌های اصلاحی — در [`adr/README.md`](./adr/README.md) است.** جدول زیر خلاصهٔ *تصمیمِ* هر ADR است، نه فهرستِ وجودیِ آن‌ها:

| کد ADR | عنوان تصمیم | خلاصهٔ تصمیم مصوب |
|---|---|---|
| **ADR-0001** | معماری کلان سیستم | مونو-ریپو شامل Next.js (SSR) در `frontend/` و Django/DRF در `backend/` قابل استقرار روی cPanel |
| **ADR-0002** | مرزبندی اپ‌های Django | معماری Modular Monolith با ۱۰ اپ دامنه‌ای مستقل به‌علاوهٔ لایهٔ تجمیع `api` (مجموعاً ۱۱ اپ؛ `api` مدل ندارد) |
| **ADR-0003** | استراتژی سه‌لایهٔ i18n | ترکیب `gettext` + `django-modeltranslation` + جدول `core.Translation` |
| **ADR-0004** | بومی‌سازی تاریخ و اعداد بک‌اند | ذخیرهٔ UTC در دیتابیس؛ تبدیل به شمسی با `jdatetime` و ارقام فارسی در لایهٔ نمایش |
| **ADR-0005** | استراتژی ذخیره‌سازی Media | ذخیرهٔ محلی با نام‌گذاری UUID، بررسی پسوند، سقف حجم، Magic Bytes و `.htaccess` ضد اجرای اسکریپت |
| **ADR-0006** | استراتژی Cache و Rate Limit | استفاده از `FileBasedCache` در پروداکشن (بدون نیاز به Redis) و `ScopedRateThrottle` سفارشی در DRF |
| **ADR-0007** | استراتژی احراز هویت اولیه | احراز هویت مبتنی بر ایمیل + رمز عبور با شناسهٔ عمومی `public_id` (UUID) برای جلوگیری از IDOR |
| **ADR-0008** | پایپ‌لاین CRM و سرنخ‌ها | تفکیک `Contact` (ثبت فرم خام)، `Lead` (قیف فروش ۶مرحله‌ای) و `Newsletter` |
| **ADR-0009** | معماری دادهٔ اولیهٔ موتور AI | طراحی جداول کاتالوگ، پرامپت، Guardrail و لاگ ممیزی هوش مصنوعی |
| **ADR-0010** | مدیریت وابستگی‌ها | استفاده از `requirements.txt` و `requirements-dev.txt` با نسخه‌های Pinشده برای سازگاری با cPanel |
| **ADR-0011** | مدل User سفارشی و درایور DB | `User` ایمیل‌محور، احراز هویت Session + CSRF، و درایور خالص پایتون `PyMySQL` برای MySQL |
| **ADR-0012** | مدل پایه و نرم‌حذف (Soft Delete) | `BaseModel` مجهز به `deleted_at`, `is_active`, `delete(hard=False)` و `restore()` |
| **ADR-0013** | طراحی لاگ ممیزی (`AuditLog`) | ثبت متمرکز رویدادهای امنیتی و مدیریتی با `GenericForeignKey` و متادیتای بدون راز |
| **ADR-0014** | لایهٔ استاندارد DRF | پاکت صفحه‌بندی یکنواخت، مدیریت خطای استاندارد و تولید اسکیمای OpenAPI با `drf-spectacular` |
| **ADR-0015** | لاگ ساختاریافته و ابزار تست | `structlog` (JSON در پروداکشن) + `pytest-django`, `factory-boy`, `ruff` و `mypy --strict` |
| **ADR-0016** | مسیریابی دوزبانهٔ Next.js 16 | استفاده از `next-intl` با `localePrefix: "as-needed"` (فارسی در `/` و انگلیسی در `/en`) و `src/proxy.ts` |
| **ADR-0017** | توکن‌های طراحی بدون فایل Figma | استخراج توکن‌های Emerald/Obsidian از اسناد مشخصات طراحی و پیاده‌سازی در Tailwind v4 |
| **ADR-0018** | فونت‌های خودمیزبان (Self-hosted) | استفاده از `@fontsource/{vazirmatn,inter,jetbrains-mono}` بدون وابستگی به CDN گوگل |
| **ADR-0019** | تاریخ و اعداد در فرانت‌اند | استفاده از `dayjs` + `jalaliday` و `Intl.NumberFormat` در `src/lib/format/` |
| **ADR-0020** | قرارداد توکن‌های CSS و صفحهٔ Design System | جلوگیری از ارجاع دوری متغیرهای CSS و ساخت صفحهٔ زندهٔ `/design-system` به‌جای Storybook |
| **ADR-0021** | جست‌وجوی تمام‌متن (Full-Text Search) | جدول `SearchIndexEntry` با ایندکس `FULLTEXT` در MySQL و جست‌وجوی رتبهندیشده در `/api/v1/search/` |
| **ADR-0022** | فرمت محتوای Markdown امن | ذخیرهٔ Markdown و تبدیل به HTML پاک‌سازی‌شده با `Markdown` + `nh3` (بایندینگ Rust ضد XSS) |
| **ADR-0023** | تست‌های E2E با Playwright | پیکربندی `@playwright/test` در دو پروژهٔ `fa` (RTL) و `en` (LTR) روی بیلد واقعی پروداکشن |
| **ADR-0024** | آداپتور اعلان پیامکی کاوه‌نگار | کلاینت سبک REST روی `requests` برای کاوه‌نگار با fallback ایمیل و بدون وابستگی به SDK قدیمی |
| **ADR-0025** | پروفایل کاربر، علاقه‌مندی‌ها و کامنت‌ها | مدیریت علاقه‌مندی‌ها، ثبت‌نام دوره و انتشار کامنت‌ها فقط پس از تأیید ادمین |
| **ADR-0026** | پیاده‌سازی نهایی `ai_engine` | مشاور ایده‌پرداز (حداکثر ۳ ایده)، لینک اشتراک با توکن هش‌شده و قابل‌لغو، تخمین‌گر بدون قیمت و خلاصه‌ساز مقاله |
| **ADR-0027** | تم اختصاصی ادمین و لایهٔ RTL | سفارشی‌سازی Jazzmin با توکن‌های برند امیت، فونت وزیرمتن خودمیزبان و ۱۰۶ قاعدهٔ RTL اسکوپ‌شده |
| **ADR-0028** | داشبورد KPI و گردش‌کار ادمین | داشبورد کش‌شده با نمودار SVG درون‌خطی و اکشن‌های گروهی انتشار/بایگانی/بازگردانی با ثبت `AuditLog` |
| **ADR-0029** | صادرات و واردات داده در ادمین | `django-import-export` با فرمت‌های CSV/TSV/JSON، واردات دو مرحله‌ای، کلید پایدار و محافظت Formula Injection |
| **ADR-0030** | ابزار i18n و مدیریت ترجمه در ادمین | اسکریپت `scripts/i18n.py` بر پایهٔ `ast` و `polib` + فیلتر کامل‌بودن ترجمه در ادمین |
| **ADR-0031** | معماری سئو و ریدایرکت‌های مدیریت‌شده | رندر سئو، JSON-LD، OG پویا، `sitemap.xml` و `robots.txt` در Next.js با منبع دادهٔ ادمین جنگو و `PUBLIC_SITE_URL` |
| **ADR-0032** | بودجهٔ کارایی و استراتژی دارایی‌ها | تصاویر AVIF/WebP با `next/image`، فونت خودمیزبان با `swap`، کش لایه‌ای و قفل سقف کوئری در تست‌ها |
| **ADR-0033** | سخت‌سازی امنیتی، 2FA و پشتیبان‌گیری | CSP دو‌سیاستی، 2FA ادمین با `django-otp`، قفل ورود ضد brute-force (`429`) و دستور چنداستراتژی `backup_db` |
| **ADR-0034** | دروازه‌های کیفیت، Pre-commit و CI/CD | یکپارچه‌سازی Ruff + Black + mypy + ESLint + Prettier، گیت پوشش تست ≥ ۸۵٪، هوک‌های Pre-commit و GitHub Actions |
| **ADR-0035** | توپولوژی استقرار روی هاست cPanel | معماری استقرار دو اپ Passenger (WSGI + Node.js) پشت دامنهٔ واحد هم‌مبدأ با دیتابیس MySQL 8 و Cron Jobها |
| **ADR-0036** | بستهٔ نهایی آمادگی استقرار (فاز ۹) | قفل ۱۰۰٪ `requirements.txt`، نهایی‌سازی `production.py`، اسکریپت‌های `deploy_backend.sh`/`deploy_frontend.sh`/`restore_backup.sh` و `DEPLOYMENT.md` |
| **ADR-0037** | فاز ۸ پورت UI — E2E، ماتریس عرض‌ها و Lighthouse | انتقال CI به ریشهٔ ریپو، دو سوئیت E2E اختصاصی پورت (`ui-port.spec.ts` و `responsive.spec.ts` با ۸ عرض مرزی) و Lighthouse CI واقعی روی شش نشانی با گیت `0.95` در هر چهار محور |
| **ADR-0038** | پایپ‌لاین CI در ریشهٔ ریپو و لایهٔ تنظیمات تست CI | یک workflow با شش جاب و مسیرهای تخت در `.github/workflows/ci.yml` + فایل `.github/ci/ci_test_settings.py` که **فقط** کلید `staticfiles` را برای تست‌ها به `StaticFilesStorage` ساده تغییر می‌دهد |
| **ADR-0039** | استاندارد توکن‌های طراحی و جفت‌بند رنگ خام | اجباری‌شدن توکن به‌جای لیترال خام، سیم‌کشی دو توکن موجود، چهار توکن پالت دسته‌بندی و دو توکن متن ملایم + گارد رگرسیون `hardcoded-colors.test.ts` با فهرست پایهٔ دوطرفه (یادداشتِ اصلاحی: `adr/README.md`) |
| **ADR-0040** | مرجعیت canonical صفحهٔ جزئیات محصول | مسیر رسمیِ جزئیات محصول `/projects/{slug}` است نه `/products/{slug}`؛ تابع سطح ماژول `projectDetailPath` هر سه مصرف (canonical، نانبرد، JSON-LD) را از یک منبع تغذیه می‌کند و `/products/pentestor` با ریدایرکت دائمی `308` به آن وصل شد |

---

## بخش سوم: مستندات کامل API (OpenAPI / REST v1)

### ۳.۱. مشخصات پایه و مستندات خودکار OpenAPI

- **آدرس پایه (Base URL):** `/api/v1/`
- **مستندات تعاملی خودکار (قانون ۸):**
  - اسکیمای خام OpenAPI 3.0 (YAML/JSON): `GET /api/v1/schema/`
  - رابط Swagger UI: `GET /api/v1/schema/swagger-ui/`
  - رابط ReDoc: `GET /api/v1/schema/redoc/`
  - دستور اعتبارسنجی در خط فرمان:
    ```bash
    python manage.py spectacular --file /tmp/schema.yaml --validate --fail-on-warn
    ```

### ۳.۲. قراردادهای عمومی درخواست و پاسخ

1. **تعیین زبان پاسخ (`Accept-Language`):**
   - ارسال هدر `Accept-Language: fa` (پیش‌فرض) یا `Accept-Language: en` باعث می‌شود فیلدهای ترجمه‌شدهٔ مدل‌ها و پیام‌های خطا در همان زبان برگردند.
2. **احراز هویت و محافظت CSRF:**
   - احراز هویت بر پایهٔ کوکی نشست استاندارد جنگو (`sessionid`) و توکن CSRF (`csrftoken`) است.
   - پیش از اولین درخواست تغییر وضعیت (`POST`, `PATCH`, `DELETE`)، کلاینت باید `GET /api/v1/auth/csrf/` را فراخوانی کند و مقدار کوکی `csrftoken` را در هدر `X-CSRFToken` ارسال نماید.
3. **قالب یکنواخت صفحه‌بندی (`StandardResultsSetPagination`):**
   ```json
   {
     "count": 24,
     "total_pages": 2,
     "current_page": 1,
     "next": "https://emmett.ir/api/v1/blog/?page=2",
     "previous": null,
     "results": []
   }
   ```
4. **قالب یکنواخت خطا (`custom_exception_handler`):**
   ```json
   {
     "error": {
       "code": "validation_error",
       "message": "یک یا چند فیلد نامعتبر است.",
       "details": {
         "email": ["یک آدرس ایمیل معتبر وارد کنید."]
       }
     }
   }
   ```
5. **محدودیت نرخ درخواست (Rate Limiting — `ADR-0006`):**
   - کاربران مهمان عمومی (`anon`): `100/hour`
   - کاربران واردشده (`user`): `1000/hour`
   - فرم تماس (`contact_form`): `5/hour`
   - احراز هویت (`auth`): `10/hour` (+ قفل حساب/IP پس از ۵ تلاش ناموفق در ۱۵ دقیقه با پاسخ `429` و هدر `Retry-After`)
   - موتور هوش مصنوعی (`ai_engine`): `20/hour`
   - عضویت خبرنامه (`newsletter`): `3/day`

### ۳.۳. فهرست کامل Endpointهای API

#### الف) سلامت، جست‌وجو و سئو (`core`)

| متد | مسیر کامل | دسترسی | توضیح و پارامترها |
|---|---|---|---|
| `GET` | `/api/v1/health/` | عمومی | بررسی سلامت دیتابیس و کش (`{"status": "ok", "checks": {"database": true, "cache": true}}`) |
| `GET` | `/api/v1/health/proxy/` | ادمین (`IsAdminUser`) | تشخیص زندهٔ زنجیرهٔ هدرهای پراکسی (`X-Forwarded-For` / `X-Real-IP` / CDN) و هم‌راستایی IP واقعی کلاینت بین `get_client_ip` و `Throttle` (`verdict.ready_for_traffic`) |
| `GET` | `/api/v1/search/` | عمومی | جست‌وجوی سراسری تمام‌متن؛ پارامترها: `q` (عبارت)، `locale` (`fa`/`en`)، `limit` (حداکثر ۵۰) |
| `GET` | `/api/v1/seo/settings/` | عمومی | تنظیمات سراسری سئو، اطلاعات سازمان، شبکه‌های اجتماعی، کد تأیید Search Console و مسیرهای `noindex` |
| `GET` | `/api/v1/seo/sitemap/` | عمومی | فهرست کامل URLهای عمومی منتشرشده برای ساخت `sitemap.xml` |
| `GET` | `/api/v1/seo/redirects/` | عمومی | قوانین ریدایرکت فعال (`301`, `302`, `410`) مدیریت‌شده در ادمین |
| `GET` | `/api/v1/seo/faq/` | عمومی | پرسش و پاسخ‌های متداول یک مسیر (`?path=/services`) برای رندر JSON-LD نوع `FAQPage` |

#### ب) احراز هویت، پروفایل و علاقه‌مندی‌ها (`accounts`)

| متد | مسیر کامل | دسترسی | توضیح و بدنهٔ درخواست |
|---|---|---|---|
| `GET` | `/api/v1/auth/csrf/` | عمومی | تنظیم کوکی `csrftoken` برای درخواست‌های بعدی |
| `POST` | `/api/v1/auth/register/` | عمومی (Throttle: `auth`) | ثبت‌نام کاربر جدید (`email`, `password`, `first_name`, `last_name`, `phone`) و ورود خودکار |
| `POST` | `/api/v1/auth/login/` | عمومی (Throttle: `auth`) | ورود با `email` و `password`؛ محافظت‌شده با `LoginLockout` |
| `POST` | `/api/v1/auth/logout/` | کاربر واردشده | پایان نشست کاربر (`204 No Content`) |
| `GET` | `/api/v1/auth/me/` | کاربر واردشده | دریافت اطلاعات کاربر جاری و `profile` |
| `PATCH` | `/api/v1/auth/me/` | کاربر واردشده | ویرایش مشخصات کاربر و پروفایل (`first_name`, `last_name`, `bio`, `job_title`, `company_name`, `locale_preference`) |
| `GET` | `/api/v1/auth/favorites/` | کاربر واردشده | فهرست صفحه‌بندی‌شدهٔ علاقه‌مندی‌های کاربر |
| `POST` | `/api/v1/auth/favorites/add/` | کاربر واردشده | افزودن آیتم به علاقه‌مندی‌ها (`content_type` مثلاً `"blog.blogpost"` یا `"academy.course"`, و `public_id`) |
| `DELETE` | `/api/v1/auth/favorites/{id}/` | کاربر واردشده | حذف آیتم از علاقه‌مندی‌های کاربر جاری |

#### ج) دسته‌بندی، تیم، خدمات و نمونه‌کارها (`taxonomy`, `company`, `services`, `portfolio`)

| متد | مسیر کامل | دسترسی | توضیح و فیلترها |
|---|---|---|---|
| `GET` | `/api/v1/taxonomy/categories/` | عمومی | فهرست دسته‌بندی‌ها؛ قابل فیلتر با `?scope=blog\|academy\|portfolio\|service` |
| `GET` | `/api/v1/taxonomy/tags/` | عمومی | فهرست برچسب‌ها |
| `GET` | `/api/v1/company/team/` | عمومی | فهرست اعضای فعال تیم به ترتیب `order` |
| `GET` | `/api/v1/company/testimonials/` | عمومی | فهرست نظرات مشتریان؛ قابل فیلتر با `?featured=true` |
| `GET` | `/api/v1/services/` | عمومی | فهرست خدمات منتشرشده؛ فیلترها: `is_featured`, `categories__slug`, `tags__slug` |
| `GET` | `/api/v1/services/{slug}/` | عمومی | جزئیات خدمت شامل `description_html` (تولیدشده از Markdown امن) و متادیتای سئو |
| `GET` | `/api/v1/projects/` | عمومی | فهرست پروژه‌ها و محصولات؛ فیلترها: `?is_product=true` (برای صفحهٔ محصولات)، `is_featured`, `year`, `service__slug` |
| `GET` | `/api/v1/projects/{slug}/` | عمومی | جزئیات پروژه به همراه `gallery_urls` و شیء کامل `case_study` (چالش، رویکرد، معماری، پشتهٔ فناوری، نتیجه و متریک‌ها) |

#### د) آکادمی، کتابخانه (بلاگ) و سرنخ‌های فروش (`academy`, `blog`, `leads`)

| متد | مسیر کامل | دسترسی | توضیح و بدنه/پارامترها |
|---|---|---|---|
| `GET` | `/api/v1/academy/` | عمومی | فهرست دوره‌های منتشرشده؛ فیلترها: `level`, `is_featured`, `categories__slug` |
| `GET` | `/api/v1/academy/{slug}/` | عمومی | جزئیات دوره به همراه اطلاعات مدرس (`instructor`) و سرفصل درس‌ها (`lessons`) |
| `GET` | `/api/v1/academy/enrollments/` | کاربر واردشده | فهرست دوره‌هایی که کاربر جاری در آن‌ها ثبت‌نام کرده است |
| `POST` | `/api/v1/academy/enrollments/add/` | کاربر واردشده | ثبت‌نام ایدمپوتنت در دوره با ارسال `{"course_slug": "..."}` |
| `GET` | `/api/v1/academy/rss/` | عمومی | فید RSS 2.0 دوره‌های منتشرشده |
| `GET` | `/api/v1/blog/` | عمومی | فهرست مقالات منتشرشده؛ فیلترها: `categories__slug`, `tags__slug` |
| `GET` | `/api/v1/blog/{slug}/` | عمومی | جزئیات مقاله شامل `content_html`، فهرست مطالب خودکار (`toc`)، کامنت‌های تأییدشده (`comments`)، مقالات مرتبط (`related_posts`) و خلاصهٔ تأییدشدهٔ هوش مصنوعی (`ai_summary`) |
| `POST` | `/api/v1/blog/{slug}/comments/` | کاربر واردشده | ثبت نظر جدید (`{"body": "...", "parent": null}`) با وضعیت اولیهٔ `pending` تا تأیید ادمین |
| `GET` | `/api/v1/blog/rss/` | عمومی | فید RSS 2.0 مقالات منتشرشده |
| `POST` | `/api/v1/leads/contact/` | عمومی (Throttle: `contact_form`) | ثبت فرم تماس (`name`, `email`, `phone`, `project_type`, `budget_range`, `timeline`, `message`, `consent_given=true`) + ارسال اعلان کاوه‌نگار/ایمیل |
| `POST` | `/api/v1/leads/newsletter/` | عمومی (Throttle: `newsletter`) | عضویت در خبرنامه (`{"email": "...", "locale_preference": "fa"}`) |

#### ه) موتور مرکزی هوش مصنوعی (`ai_engine`)

| متد | مسیر کامل | دسترسی | توضیح و قوانین |
|---|---|---|---|
| `GET` | `/api/v1/ai/catalogs/` | عمومی | دریافت کاتالوگ‌ها و گزینه‌های فعال/عمومی با برچسب بومی‌سازی‌شده؛ فیلتر اختیاری `?keys=job_role,goal,...` |
| `POST` | `/api/v1/ai/advisor/` | عمومی (Throttle: `ai_engine`) | تولید حداکثر ۳ ایدهٔ نرم‌افزاری از روی کلیدهای بستهٔ کاتالوگ (`job_role`, `business_size`, `city_scale`, `budget_range`, `team_size`, `goals[]`)؛ برمی‌گرداند: `share_token` و `suggestion` |
| `GET` | `/api/v1/ai/results/{token}/` | عمومی (`noindex`) | مشاهدهٔ پیشنهاد اشتراک‌گذاری‌شده با توکن؛ فاقد ورودی‌های اولیه و فاقد اطلاعات تماس |
| `POST` | `/api/v1/ai/leads/` | عمومی (Throttle: `contact_form`) | ثبت سرنخ فروش (`Lead` + `Contact`) متصل به یک پیشنهاد و ایدهٔ مشخص AI (`share_token`, `concept_public_id`, `contact`) |
| `POST` | `/api/v1/ai/estimates/` | عمومی (Throttle: `ai_engine`) | محاسبهٔ قطعی (Deterministic) حداقل روز کاری خوش‌بینانه بر اساس `delivery_scope` و قواعد `EstimationRule` بدون ارائهٔ قیمت عددی |

---

## بخش چهارم: راهنمای جامع پنل مدیریت (Admin Guide)

> در پروداکشن cPanel، Django با `DJANGO_FORCE_SCRIPT_NAME=/backend` mount می‌شود؛ بنابراین پیشوند `/backend` را به تمام مسیرهای ادمین و i18n این بخش اضافه کنید (مثلاً `/backend/admin/`). مسیرهای بدون پیشوند، مسیر Django در توسعهٔ محلی هستند.

### ۴.۱. ورود، نقش‌ها و تجربهٔ کاربری دوزبانه (RTL/LTR)

- **آدرس پنل:** `/admin/`
- **تغییر زبان:** از منوی بالای پنل (`/i18n/setlang/`) بین **فارسی (پیش‌فرض، راست‌به‌چپ)** و **انگلیسی (چپ‌به‌راست)** جابه‌جا شوید. فایل استایل `emmett-rtl.css` (شامل ۱۰۶ قاعدهٔ اسکوپ‌شده زیر `html[dir="rtl"]`) فقط در زبان فارسی بارگذاری می‌شود (`ADR-0027`).
- **فونت و دارایی‌ها:** تمام فونت‌ها (وزیرمتن در ۸ وزن `woff2`) و آیکون‌ها خودمیزبان هستند و هیچ وابستگی به CDN خارجی وجود ندارد.
- **ماتریس نقش‌ها:**
  - **نویسنده/مترجم:** ویرایش پیش‌نویس محتوا و ردیف‌های ترجمه؛
  - **ویرایشگر محتوا (`editor`):** اجرای اکشن‌های انتشار، بازگشت به پیش‌نویس و بایگانی، تأیید کامنت‌ها و خلاصه‌های AI؛
  - **مدیر فروش:** مدیریت `Contact` و وضعیت‌های `Lead` در قیف فروش؛
  - **ابرکاربر (`is_superuser`):** دسترسی کامل، مدیریت کاربران، صادرات/واردات داده، بازنشانی 2FA و تنظیمات سئو/AI.

### ۴.۲. داشبورد مدیریتی KPI

صفحهٔ نخست `/admin/` یک داشبورد تحلیلی کش‌شده (`ADMIN_DASHBOARD_CACHE_SECONDS=120`) است (`ADR-0028`):
- **۶ کارت KPI:** تعداد کاربران، درخواست‌های AI (به‌همراه نرخ Cache Hit و موارد مسدودشدهٔ Guardrail)، سرنخ‌های فروش و نرخ تبدیل، ثبت‌نام‌های آکادمی، سیگنال‌های فروش ۳۰ روزه، و خلاصه‌های AI در انتظار تأیید.
- **نمودارهای روند ۸ هفته‌ای:** نمودارهای میله‌ای SVG درون‌خطی برای درخواست‌های AI و تماس‌های جدید.
- **جدول قیف فروش و وضعیت محتوا:** تفکیک سرنخ‌ها (`new → contacted → qualified → proposal → won → lost`) و وضعیت انتشار محتواها (`draft / published / archived`).
- **ویجت‌های حسابرسی:** آخرین رخدادهای حساس ثبت‌شده در `AuditLog` و آخرین تغییرات شخص ادمین جاری در `LogEntry`.

### ۴.۳. گردش‌کار انتشار محتوا و نرم‌حذف/بازگردانی

- **اکشن‌های گروهی انتشار (`PublishWorkflowMixin`):**
  1. `Publish selected content`: تغییر وضعیت به `published` و مقداردهی اولیهٔ `published_at` (در انتشار مجدد، تاریخ انتشار اولیه حفظ می‌شود).
  2. `Return selected content to draft`: بازگرداندن به `draft`.
  3. `Archive selected content`: انتقال به `archived`.
  - هر سه اکشن نیازمند مجوز `change` هستند و به‌صورت خودکار یک رکورد حسابرسی در `AuditLog` ثبت می‌کنند.
- **نرم‌حذف و بازگردانی (`SoftDeleteAdminMixin`):**
  - حذف رکوردها در کل سیستم نرم است (`deleted_at` پر می‌شود و `is_active=False` می‌گردد).
  - برای بازگردانی: در ستون فیلتر سمت چپ، فیلتر **وضعیت رکورد (`Record state`)** را روی **حذف‌شده (`Deleted`)** قرار دهید، رکوردها را انتخاب کنید و اکشن **بازگردانی رکوردهای انتخاب‌شده (`Restore selected records`)** را اجرا نمایید.

### ۴.۴. مدیریت ترجمه‌ها و ابزار `scripts/i18n.py`

- **در پنل ادمین (`Core → Translations`):**
  - فیلتر **کامل‌بودن ترجمه (`translation completeness`)** کلیدهایی را که نسخهٔ فارسی یا انگلیسی آن‌ها جا افتاده است نشان می‌دهد.
  - اکشن **ساخت ردیف زبان غایب (`Create the missing language row`)** به‌صورت خودکار ردیف زبان مقابل را می‌سازد تا مترجم آن را پر کند.
- **در خط فرمان (برای رشته‌های gettext کد):**
  ```bash
  cd backend
  python scripts/i18n.py extract   # استخراج رشته‌های جدید از کد پایتون و قالب‌ها
  python scripts/i18n.py compile   # کامپایل فایل‌های .po به .mo
  python scripts/i18n.py check     # بررسی ۱۰۰٪ ترجمهٔ فارسی و تازگی فایل‌های .mo
  python scripts/i18n.py stats     # نمایش آمار پوشش ترجمه
  ```

### ۴.۵. مدیریت موتور AI در ادمین

- **کاتالوگ‌ها و گزینه‌ها (`Catalog`, `CatalogOption`):** پس از ساخت هر رکورد، فیلد کلید (`key`) قفل و تغییرناپذیر می‌شود تا قرارداد API نشکند.
- **پرامپت‌های نسخه‌دار (`PromptTemplate`):** برای تغییر پرامپت، نسخهٔ جدیدی با `version` بالاتر بسازید و با اکشن **بایگانی نسخه‌های قدیمی‌تر (`Archive superseded versions`)** نسخه‌های قبلی همان قابلیت و زبان را غیرفعال کنید.
- **خلاصه‌های مقالات (`AIContentArtifact`):** خلاصه‌های تولیدشده با دستور `python manage.py generate_blog_summaries` با وضعیت `draft` ایجاد می‌شوند و تنها پس از اجرای اکشن **تأیید خلاصه‌های انتخاب‌شده (`Approve selected summaries`)** در API عمومی بلاگ نمایش می‌یابند. اگر متن مقالهٔ اصلی ویرایش شود، خلاصهٔ قبلی به‌طور خودکار `is_stale=True` شده و از نمایش عمومی خارج می‌شود.
- **لغو لینک اشتراک (`AISuggestion`):** با اکشن **لغو پیوندهای اشتراک عمومی** می‌توانید دسترسی عمومی به یک لینک `/advisor/results/{token}` را مسدود کنید (`share_revoked_at`).

### ۴.۶. صادرات و واردات داده (CSV / TSV / JSON)

- هر ۳۵ مدلِ ثبت‌شده در ۱۰ اپِ دامنه‌ای، کلاس صریح `Resource` در `apps/<app>/resources.py` دارند (`ADR-0029`). مجموعاً ۳۶ کلاس `*Resource` وجود دارد: ۳۵ کلاس مخصوصِ هر مدل + کلاس پایهٔ مشترکِ `EmmettResource` در `apps/core/resources.py:60`.
- **امنیت صادرات:** سلول‌هایی که با کاراکترهای خطرناک اکسل (`=`, `+`, `-`, `@`) شروع شوند به‌طور خودکار خنثی‌سازی (Formula Injection Escape) می‌شوند و هر عملیات صادرات در `AuditLog` با نام فایل، فرمت و تعداد ردیف ثبت می‌گردد.
- **واردات دو مرحله‌ای و ایدمپوتنت:** واردات ابتدا پیش‌نمایش تغییرات (`new / update / skip`) را نشان می‌دهد و پس از تأیید، درون یک تراکنش دیتابیس (`IMPORT_EXPORT_USE_TRANSACTIONS=True`) بر اساس کلید طبیعی پایدار (`slug`, `(course, order)`, `(namespace, key, locale)`) اعمال می‌شود. مدل‌های کاربرمحور و لاگ‌ها (`User`, `Contact`, `Lead`, `Comment`, `Enrollment`, `AuditLog`, `AIRequest`) صرفاً قابلیت صادرات دارند و واردات آن‌ها غیرفعال است.

### ۴.۷. احراز هویت دو مرحله‌ای (2FA) و مدیریت سئو در ادمین

- **راه‌اندازی 2FA (`ADR-0033`):**
  - در پروداکشن `ADMIN_2FA_REQUIRED=True` است. کارکنان هنگام ورود به `/admin/2fa/setup` هدایت می‌شوند تا کد QR (تولیدشده به‌صورت SVG آفلاین درون `data:`) یا کلید دستی Base32 را در اپ Authenticator وارد کنند.
  - پس از تأیید، ۸ کد بازیابی یک‌بارمصرف در `/admin/2fa/recovery` نمایش داده می‌شود.
  - صفحهٔ `/admin/2fa/verify` پس از ۵ تلاش ناموفق به مدت ۵ دقیقه قفل می‌شود.
- **تنظیمات سئو (`ADR-0031`):**
  - در `Site settings`: عنوان و توضیحات متای پیش‌فرض، اطلاعات تماس سازمان، لینک شبکه‌های اجتماعی، تصویر OG پیش‌فرض و کد تأیید Google Search Console را تنظیم کنید.
  - در `Redirects`: مسیرهای قدیمی را با کد وضعیت `301` (انتقال دائم)، `302` (موقت) یا `410` (حذف دائمی محتوا با صفحهٔ اختصاصی `410 Gone`) تعریف کنید.
  - در `FAQ items`: پرسش و پاسخ‌های متداول هر صفحه (مثلاً `/services`) را ثبت کنید تا به‌طور خودکار در اسکیمای `FAQPage` آن صفحه قرار گیرد.

### ۴.۸. مرجع کدهای بررسی سلامت سیستم (`System Checks`)

| کد | سطح | شرح و نحوهٔ رفع |
|---|---|---|
| `emmett_admin.E001` | خطا | `jazzmin` باید پیش از `django.contrib.admin` در `INSTALLED_APPS` باشد |
| `emmett_admin.E002` | خطا | پکیج `import_export` در `INSTALLED_APPS` ثبت نشده است |
| `emmett_admin.E003` | خطا | دایرکتوری قالب‌های سفارشی `backend/templates/admin` یافت نشد |
| `emmett_admin.E004` | خطا | فایل‌های استاتیک تم ادمین (`emmett-admin.css`, `emmett-rtl.css`, فونت وزیرمتن) روی دیسک نیستند |
| `emmett_admin.W005` | هشدار | فایل `.mo` وجود ندارد یا قدیمی‌تر از `.po` است ← اجرای `python scripts/i18n.py compile` |
| `emmett_admin.W006` | هشدار | لینک به CDN فونت خارجی در قالب‌های ادمین یافت شد |
| `emmett_admin.W007` | هشدار Deploy | متغیر `PUBLIC_SITE_URL` روی مقدار پیش‌فرض/لوکال است ← تنظیم دامنهٔ واقعی HTTPS |
| `emmett_admin.W008` | هشدار | هدر امنیتی CSP غیرفعال شده است (`DJANGO_CSP_ENABLED=False`) |
| `emmett_admin.W009` | هشدار Deploy | اجبار 2FA ادمین در پروداکشن خاموش است (`ADMIN_2FA_REQUIRED=False`) |
| `emmett_admin.W010` | هشدار Deploy | کد تأیید Google Search Console در `SiteSettings` وارد نشده است |
| `emmett_admin.W011` / `W012` | هشدار Deploy | مسیر پشتیبان‌گیری (`BACKUP_DIR`) وجود ندارد یا قابل‌نوشتن نیست |
| `emmett_admin.W013` | هشدار Deploy | مقدار `DJANGO_SECRET_KEY` کوتاه یا برابر مقدار نمونه است |

---

## بخش پنجم: راهنمای گام‌به‌گام استقرار روی هاست اشتراکی cPanel

این راهنما بر اساس `ADR-0035` برای هاست‌های اشتراکی لینوکسی ایرانی مجهز به **cPanel + Phusion Passenger (Python & Node.js) + MySQL 8** تدوین شده است.

### ۵.۱. پیش‌نیازهای هاست cPanel

1. فعال بودن بخش‌های **Setup Python App** (با Python 3.11) و **Setup Node.js App** (با Node.js 22 LTS) در cPanel؛
2. دسترسی به **MySQL Databases** (نسخهٔ MySQL 8.0 یا MariaDB هم‌ارز با پشتیبانی کامل از `utf8mb4` و ایندکس `FULLTEXT`)؛
3. فعال بودن گواهی SSL (از طریق **SSL/TLS Status → Run AutoSSL**) روی دامنهٔ اصلی؛
4. دسترسی به **Terminal** (یا SSH) و **Cron Jobs** در cPanel.

### ۵.۲. گام ۱: ساخت دیتابیس MySQL در cPanel

1. در cPanel وارد **MySQL® Databases** شوید.
2. یک دیتابیس جدید (مثلاً `cpaneluser_emmett`) بسازید.
3. در بخش **MySQL Users** یک کاربر جدید (مثلاً `cpaneluser_app`) با رمز عبور قوی بسازید و با **Add User To Database** تمام دسترسی‌ها (`ALL PRIVILEGES`) را روی دیتابیس بالا به او بدهید.
4. در **phpMyAdmin** اطمینان حاصل کنید که Collation دیتابیس روی `utf8mb4_unicode_ci` قرار دارد:
   ```sql
   ALTER DATABASE `cpaneluser_emmett` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### ۵.۳. گام ۲: دریافت کد در هاست و آماده‌سازی پوشه‌ها

در ترمینال cPanel دستورات زیر را اجرا کنید:

```bash
cd ~
git clone https://github.com/EmmettSS/EmmettWebSite.git
cd ~/EmmettWebSite

# ساخت پوشه‌های عملیاتی خارج از Git با دسترسی محدود به کاربر هاست
mkdir -p ~/EmmettWebSite/backend/media
mkdir -p ~/EmmettWebSite/backend/backups
mkdir -p ~/EmmettWebSite/backend/.cache/django-cache
chmod 700 ~/EmmettWebSite/backend/backups ~/EmmettWebSite/backend/.cache/django-cache

# کپی کردن فایل امنیتی .htaccess برای جلوگیری از اجرای اسکریپت در پوشهٔ media (ADR-0005)
cp ~/EmmettWebSite/backend/deploy/media.htaccess.example ~/EmmettWebSite/backend/media/.htaccess

# کپی کردن فایل ورودی Passenger WSGI برای بک‌اند جنگو (ADR-0035)
cp ~/EmmettWebSite/backend/deploy/passenger_wsgi.py.example ~/EmmettWebSite/backend/passenger_wsgi.py
```

### ۵.۴. گام ۳: تنظیم و راه‌اندازی بک‌اند Django (`Setup Python App`)

1. در cPanel وارد **Setup Python App** شوید و روی **Create Application** کلیک کنید:
   - **Python version:** `3.11`
   - **Application root:** `EmmettWebSite/backend`
   - **Application URL:** دقیقاً `/backend` روی دامنهٔ اصلی؛ Node.js در `/` می‌ماند. این الگو باید توسط ارائه‌دهندهٔ cPanel پشتیبانی شود.
   - **Application startup file:** `passenger_wsgi.py`
   - **Application Entry point:** `application`
2. دستور فعال‌سازی محیط مجازی نمایش‌داده‌شده در بالای صفحهٔ Setup Python App را کپی و در ترمینال اجرا کنید:
   ```bash
   source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
   cd ~/EmmettWebSite/backend
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. متغیرهای runtime جنگو را در **Setup Python App → Environment Variables** تنظیم کنید: `DJANGO_SETTINGS_MODULE=config.settings.production`, `DJANGO_FORCE_SCRIPT_NAME=/backend`, دامنهٔ canonical و CSRF، تنظیمات MySQL، `FRONTEND_REVALIDATE_URL` و یک `FRONTEND_REVALIDATE_SECRET` پرقدرت. همان secret را در Environment Variables اپ Node نیز ثبت کنید. نام دیتابیس، کاربر، میزبان، دامنه و مسیرها را فقط از cPanel/provider واقعی بگیرید؛ مقادیر نمونه را حدس نزنید.
4. متغیرهای Passenger را در Terminal/Cron خودکار فرض نکنید. اگر فرمان‌های CLI یا Cron به env نیاز دارند و cPanel آن را به آن‌ها منتقل نمی‌کند، یک `backend/.env` خصوصی روی سرور با مجوز `600` و خارج از Git بسازید؛ از نمونه فقط به‌عنوان فهرست متغیرها استفاده کنید و همهٔ مقدارهای توسعه را جایگزین کنید. جزئیات در [راهنمای عملیات Production](deployment/production-operations.md) آمده است.
5. دستورهای مهاجرت پایگاه داده، جمع‌آوری فایل‌های استاتیک، بررسی ترجمه‌ها و چک امنیتی استقرار را اجرا کنید:
   ```bash
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   python scripts/i18n.py check
   python manage.py check --deploy
   python manage.py createsuperuser
   ```
6. در صفحهٔ **Setup Python App** دکمهٔ **Restart** را بزنید.

### ۵.۵. گام ۴: بیلد و راه‌اندازی فرانت‌اند Next.js (`Setup Node.js App`)

1. در cPanel وارد **Setup Node.js App** شوید و روی **Create Application** کلیک کنید:
   - **Node.js version:** دقیقاً `22.22.3` (مطابق `frontend/package.json` و CI)
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** `emmett.ir`
   - **Application startup file:** `server.js` (نمونهٔ مخزن: `frontend/deploy/server.js.example`)
2. متغیرهای محیطی زیر را در بخش **Environment variables** اپلیکیشن Node.js اضافه کنید:
   - `NODE_ENV` = `production`
   - `PUBLIC_SITE_URL` = `https://emmett.ir`
   - `INTERNAL_API_URL` = `https://emmett.ir/backend` (mount اپ Python؛ host را برای دامنهٔ canonical خود جایگزین کنید)
   - `FRONTEND_REVALIDATE_SECRET` = همان secret سمت Django، بدون پیشوند `NEXT_PUBLIC_`
3. در ترمینال، محیط مجازی Node.js را فعال کرده و پروژه را بیلد کنید:
   ```bash
   source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
   cd ~/EmmettWebSite/frontend
   npm ci
   npm run build
   ```
4. در صفحهٔ **Setup Node.js App** دکمهٔ **Restart** را بزنید.

### ۵.۶. گام ۵: تنظیم Cron Jobهای عملیاتی در cPanel

در بخش **Cron Jobs** سی‌پنل، سه فرمان زیر را ثبت کنید (`<cpanel_user>` را با نام کاربری هاست جایگزین کنید):

1. **پشتیبان‌گیری خودکار روزانه (هر شب ساعت ۰۳:۳۰):**
   ```cron
   30 3 * * * cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py backup_db --keep 7 >> /home/<cpanel_user>/backup.log 2>&1
   ```
2. **هرس لاگ‌های قدیمی هوش مصنوعی (یکشنبه‌ها ساعت ۰۴:۰۰):**
   ```cron
   0 4 * * 0 cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py purge_ai_audit >> /home/<cpanel_user>/ai_purge.log 2>&1
   ```
3. **تولید پیش‌نویس خلاصهٔ مقالات جدید بلاگ (روزانه ساعت ۰۴:۳۰ — در صورت فعال بودن `AI_ENABLED=true`):**
   ```cron
   30 4 * * * cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py generate_blog_summaries >> /home/<cpanel_user>/ai_summary.log 2>&1
   ```

### ۵.۷. گام ۶: چک‌لیست تأیید پس از استقرار (Post-Deployment Checklist)

- [ ] فراخوانی `https://emmett.ir/api/v1/health/` کد `200 OK` و `{"status": "ok", "checks": {"database": true, "cache": true}}` برمی‌گرداند.
- [ ] پس از ورود به `/backend/admin/`، فراخوانی تشخیصی `https://emmett.ir/api/v1/health/proxy/` کد `200 OK` و `verdict.ready_for_traffic: true` برمی‌گرداند (تأیید اینکه `X-Forwarded-For` از Apache و Next.js عبور کرده و `resolved_client_ip` آدرس واقعی کاربر است، نه `127.0.0.1`).
- [ ] خروجی `python manage.py check --deploy` هیچ خطا یا هشدار امنیتی (`W007`–`W013`) ندارد.
- [ ] ورود به `https://emmett.ir/backend/admin/` کاربر staff را به راه‌اندازی 2FA (`/backend/admin/2fa/setup`) هدایت می‌کند و کدهای بازیابی در جای امن ذخیره شده‌اند.
- [ ] در `Site settings` پنل ادمین، کد تأیید Google Search Console وارد شده و `https://emmett.ir/sitemap.xml` در Search Console ثبت شده است.
- [ ] صفحات `/` (فارسی، `dir="rtl"`) و `/en` (انگلیسی، `dir="ltr"`)، فیدهای `/blog/rss` و `/academy/rss` و تصویر `/opengraph-image` بدون خطا بارگذاری می‌شوند.
- [ ] دستور `python manage.py backup_db` یک‌بار دستی اجرا شده و فایل‌های `db-*.gz` و `manifest-*.json` در پوشهٔ `backups/` ساخته شده‌اند.

---

## بخش ششم: دروازه‌های کیفیت، تست، Pre-commit و پایپ‌لاین CI/CD

### ۶.۱. دستورات کامل کیفیت کد و تست

#### در بک‌اند (`backend/`):
```bash
cd backend
source .venv/bin/activate

ruff check .                                                        # لینت پایتون
ruff format --check .                                               # بررسی فرمت با Ruff
black --check .                                                     # بررسی فرمت با Black
mypy apps config                                                    # تایپ‌چک سخت‌گیرانه (strict)
bandit -c pyproject.toml -r apps config -ll                         # تحلیل امنیتی استاتیک (SAST)
python scripts/i18n.py check                                        # بررسی پوشش ۱۰۰٪ ترجمهٔ فارسی و .mo
python manage.py check                                              # بررسی سلامت سیستم جنگو
python manage.py makemigrations --check --dry-run                   # بررسی عدم وجود تغییر مدل بدون migration
python manage.py spectacular --file /tmp/schema.yaml --validate --fail-on-warn
PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest -q && coverage report --fail-under=85 -m
    # اجرای تست‌ها با شرط پوشش ≥ ۸۵٪ (لایهٔ `ci_test_settings` استوریج تست را ساده می‌کند؛ در تنظیمات پایه نیز `NonStrictCompressedManifestStaticFilesStorage` فعال است تا اجرای مستقیم `pytest` و رندر پروداکشن پنل ادمین بدون خطای manifest کار کند)
```

#### در فرانت‌اند (`frontend/`):
```bash
cd frontend

npm run format:check     # بررسی فرمت کد با Prettier
npm run lint             # بررسی قواعد ESLint
npm run typecheck        # بررسی تایپ TypeScript (tsc --noEmit با strict=true)
npm run test:coverage    # اجرای تست‌های Vitest با شرط پوشش ≥ ۸۵٪
npm run build            # بیلد کامل پروداکشن Next.js
npm run test:e2e         # اجرای تست‌های مرورگر واقعی Playwright
```

### ۶.۲. هوک‌های Pre-commit (`.pre-commit-config.yaml`)

برای فعال‌سازی هوک‌های خودکار پیش از هر کامیت:

```bash
backend/.venv/bin/pre-commit install
backend/.venv/bin/pre-commit install --hook-type commit-msg
backend/.venv/bin/pre-commit run --all-files
```

این هوک‌ها به‌ترتیب موارد زیر را بررسی می‌کنند:
1. اسکن عدم وجود کلید خصوصی، توکن یا فایل `.env` (`scripts/check_secrets.py`)؛
2. لینت و فرمت بک‌اند (`ruff check`, `ruff format --check`, `black --check`)؛
3. تایپ‌چک سخت‌گیرانهٔ بک‌اند (`mypy apps config`) و سلامت ترجمه (`scripts/i18n.py check`)؛
4. فرمت، لینت و تایپ‌چک فرانت‌اند (`prettier --check`, `eslint`, `tsc --noEmit`)؛
5. تطابق پیام کامیت با استاندارد **Conventional Commits** (`scripts/check_commit_msg.py`).

### ۶.۳. پایپ‌لاین GitHub Actions (`.github/workflows/ci.yml`)

در هر Push یا Pull Request، شش جاب زیر به‌طور خودکار اجرا می‌شوند:
1. **`backend-quality`**: اجرای Ruff، Black، Mypy strict، بررسی‌های جنگو، بررسی `.po/.mo` و اعتبارسنجی اسکیمای OpenAPI.
2. **`backend-test`**: اجرای کل سوییت تست `pytest` با گیت اجباری `coverage report --fail-under=85`.
3. **`frontend-quality`**: اجرای Prettier، ESLint و TypeScript strict.
4. **`frontend-test-build`**: اجرای تست‌های Vitest با گیت پوشش `≥ 85%` و اجرای `next build`.
5. **`security-scan`**: اجرای `check_secrets.py`، اسکن `bandit`، بررسی `manage.py check --deploy` با تنظیمات پروداکشن و اجرای `npm audit --omit=dev`.
6. **`e2e-and-lighthouse`**: بالا آوردن سرور Django با دادهٔ `seed_demo_data`، اجرای سرور پروداکشن Next.js، اجرای کامل تست‌های E2E با Playwright و سنجش بودجهٔ کارایی با **Lighthouse CI** (`.lighthouserc.json` با حداقل امتیاز `0.95` در هر چهار محور Performance، Accessibility، Best Practices و SEO).

### ۶.۴. پوشش تست: دامنهٔ واقعی اندازه‌گیری

> **این بند عمداً صریح نوشته شده است.** نقلِ درصدِ پوشش بدونِ ذکرِ دامنه گمراه‌کننده است، زیرا گیت‌های CI روی **بخشی** از کد اعمال می‌شوند نه کل آن. هر عددِ پوشش در این مخزن باید همراه با دامنه‌اش خوانده شود.
>
> همهٔ اعدادِ این بند در یک نشستِ اندازه‌گیریِ واحد روی کامیت `9c6d685` گرفته شده‌اند (Vitest `5.0.3` با provider `v8`؛ `coverage` پایتون با تنظیمات `backend/pyproject.toml`) و با **۹۹ تست واحد فرانت‌اند** و **۴۹۷ تست بک‌اند** هم‌خوان‌اند.

#### ۶.۴.۱. فرانت‌اند — گیت چه چیزی را می‌سنجد

کلید `coverage.include` در `frontend/vitest.config.mts` روی **پنج گلوب** تنظیم شده است: `src/lib/**/*.ts` و `src/components/{ui,molecules,organisms,seo}/**/*.tsx`. آستانه‌های اجباری `85 / 78 / 85 / 85` (statements / branches / functions / lines) هستند.

این دامنه **۳۲ فایل از ۹۳ فایلِ منبعِ `src`** را می‌پیماید (۳۴٪):

| دامنهٔ اندازه‌گیری | فایل | statements | branches | functions | lines |
|---|---|---|---|---|---|
| گیتِ CI همان‌طور که پیکربندی شده | ۳۲ از ۹۳ | **۹۸٫۰۸** | **۷۸٫۳۱** | **۹۸٫۲۲** | **۹۸٫۶۸** |
| همان دامنه **بدون** استثنای `profile-view.tsx` | ۳۳ از ۹۳ | ۸۸٫۱۰ | **۷۱٫۳۷** ⚠️ | ۹۱٫۲۰ | ۸۸٫۳۸ |
| **کلِ `src`** (عددِ صادقانهٔ فرانت‌اند) | ۹۳ | **۴۱٫۶۷** | **۳۶٫۱۴** | **۴۵٫۳۱** | **۴۱٫۹۹** |

⚠️ سطر دوم از این جهت مهم است که **بارِ گیت را به دوش می‌کشد**: با احتساب `profile-view.tsx`، معیار `branches` به ۷۱٫۳۷ می‌رسد و آستانهٔ ۷۸ را **می‌شکند**. یعنی پاس‌شدنِ گیتِ branches به استثنا بودنِ همین یک فایل وابسته است (جزئیات در ۶.۴.۳).

#### ۶.۴.۲. فرانت‌اند — چه چیزی سنجیده نمی‌شود

**۶۱ فایل منبع** در هیچ‌کدام از پنج گلوب بالا نمی‌گنجند و بنابراین در عددِ پوشش **لحاظ نمی‌شوند**:

| مسیر | فایل | statements | branches | functions | lines | چه چیزی است |
|---|---|---|---|---|---|---|
| `src/app/**` | ۳۵ | **۰٫۴۸** | ۰ | ۰ | **۰٫۵۱** | هر ۳۵ فایلِ زیر `src/app`: ‏۳۱ فایلِ بخشِ مسیر (۲۰ ‏`page.tsx`، ۴ ‏`layout.tsx`، ۳ ‏`route.ts`، ۲ ‏`error.tsx` شامل `global-error.tsx`، ۲ ‏`not-found.tsx`) به‌علاوهٔ ۴ فایلِ تولیدِ متادیتا/داده (`sitemap.ts`، `robots.ts`، `opengraph-image.tsx`، `hardcoded-colors.baseline.ts`) |
| `src/components/ui-port/**` | ۲۲ | **۲۱٫۰۷** | ۲۰٫۴۹ | ۲۴٫۴۱ | ۲۱٫۳۲ | پوستهٔ دیده‌شدهٔ سایت: صفحهٔ خانه، navbar، هیرو، پالت ⌘K، فوتر و بخش‌های محصولات/خدمات/پروژه‌ها/آکادمی/کتابخانه/تماس |
| `src/i18n/**` | ۳ | **۲۸٫۵۷** | ۰ | ۰ | ۲۸٫۵۷ | `navigation.ts`، `request.ts`، `routing.ts` |
| `src/proxy.ts` | ۱ | **۰** | ۰ | ۰ | ۰ | پروکسی middleware (بازنویسی مسیرها و هدایت‌ها) |

اگر همهٔ `src` سنجیده شود، پوشش فرانت‌اند **۴۱٫۶۷٪** است — نه ۹۸٪.

> **هشدارِ روش‌سنجی دربارهٔ جدول بالا:** گزارشِ متنیِ Vitest برای هر پوشه فقط فایل‌های **مستقیمِ** همان پوشه را جمع می‌زند، نه کل زیردرخت را. به همین دلیل سطرِ `src/app` در خروجیِ `text` عددِ **۶٫۲۵٪** را نشان می‌دهد، در حالی که عددِ واقعیِ هر ۳۵ فایلِ زیردرخت **۰٫۴۸٪** (statements) و **۰٫۵۱٪** (lines) است. اعدادِ `src/app/**` در این جدول از `coverage/coverage-summary.json` محاسبه شده‌اند که مرجعِ معتبر است. برای بقیهٔ پوشه‌ها (`ui-port`، `i18n`، `organisms`، `seo`، `ui`، `molecules`) چون زیرپوشه ندارند، سطرِ گزارشِ متنی با مقدارِ زیردرخت یکی است.
>
> وزنِ هر دامنه از کلِ ۱۶۹۹ ‏statement فرانت‌اند: ‏`ui-port` **۳۹٫۴٪**، `src/app/**` **۲۴٫۵٪**، `src/lib/**` **۱۷٫۴٪**، چهار پوشهٔ کامپوننتِ سنجیده‌شده **۱۶٫۴٪**، `src/proxy.ts` **۱٫۹٪** و `src/i18n/**` **۰٫۴٪**. این وزن‌ها در ۶.۴.۸ برای فرافکنی استفاده می‌شوند.
>
> نکتهٔ دقت: `ui-port` پنج فایل `.ts` هم دارد که دو تای آن‌ها تست‌پذیر و خوب پوشش داده شده‌اند (`dialog-a11y.ts` = ۹۱٫۴۸٪، `home-data.ts` = ۱۰۰٪). اگر دامنه فقط `**/*.tsx` گرفته شود، این دو جا می‌افتند و عددِ `ui-port` به‌اشتباه **۱۳٫۲۴٪** به‌جای **۲۱٫۰۷٪** گزارش می‌شود. عددِ درست همان ۲۱٫۰۷٪ است که همهٔ فایل‌های پوشه را شامل می‌شود.

#### ۶.۴.۳. فرانت‌اند — استثنائاتِ `coverage.exclude`

سه فایل صریحاً استثنا شده‌اند. دو تای اول کاملاً موجه‌اند، سومی نه:

| فایل | خط | export اجرایی | پوشش | قضاوت |
|---|---|---|---|---|
| `src/lib/api/types.ts` | ۲۸۳ | **۰** (۳۱ `type`/`interface`) | — | ✅ **موجه** — فقط اعلامِ نوع است و هیچ JS تولید نمی‌کند |
| `src/lib/seo/types.ts` | ۷۴ | **۰** (۹ `type`) | — | ✅ **موجه** — همان دلیل |
| `src/components/organisms/profile-view.tsx` | ۲۵۰ | **۱۶** | **۰٪** (خطوط ۱–۲۳۸) | ❌ **ناموجه** — یک کامپوننت اجراییِ واقعی است که هیچ تستی آن را اجرا نمی‌کند |

#### ۶.۴.۴. فرانت‌اند — دو ویژگیِ خودِ گیت که باید شناخته شوند

**۱) آستانهٔ `branches` (۷۸) با سه معیار دیگر (۸۵) ناهمگون است** و یک آستانهٔ تک‌عددِ سراسری، ضعفِ تفکیکی را پنهان می‌کند. در همان دامنهٔ سنجیده‌شده، دو پوشه **به‌تنهایی زیر ۷۸** هستند و فقط چون `lib`/`ui`/`molecules` روی ۱۰۰٪‌اند، میانگینِ سراسری از ۷۸ رد می‌شود:

| پوشه | statements | branches | functions | lines |
|---|---|---|---|---|
| `src/lib` | ۱۰۰ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `src/lib/api` | ۹۸٫۳۸ | ۸۵٫۷۱ | ۱۰۰ | ۱۰۰ |
| `src/lib/format` | ۱۰۰ | ۷۵ | ۱۰۰ | ۱۰۰ |
| `src/lib/seo` | ۹۷٫۳۵ | ۷۹٫۵۴ | ۹۴٫۴۴ | ۹۷٫۷۶ |
| `src/components/ui` | ۱۰۰ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `src/components/molecules` | ۱۰۰ | ۹۳٫۳۳ | ۱۰۰ | ۱۰۰ |
| `src/components/organisms` | ۹۷٫۸۹ | **۷۱٫۲۸** ← زیر ۷۸ | ۹۸٫۴۱ | ۹۸٫۲۲ |
| `src/components/seo` | ۱۰۰ | **۷۵** ← زیر ۷۸ | ۱۰۰ | ۱۰۰ |

**۲) حاشیهٔ گیت باریک است.** پس از بستهٔ ۴، حاشیهٔ `branches` فقط **+۰٫۳۱** است (۷۸٫۳۱ در برابر آستانهٔ ۷۸). یعنی افزودنِ تقریباً هر کدِ شعبه‌داری بدون تست، گیت را قرمز می‌کند.

#### ۶.۴.۵. بک‌اند — دامنه و اعداد

`backend/pyproject.toml` مقدار `source = ["apps"]` و `omit = ["*/migrations/*", "*/tests/*"]` و `fail_under = 85` را تنظیم کرده است.

| دامنهٔ اندازه‌گیری | فایل | statements | missed | پوشش |
|---|---|---|---|---|
| گیتِ CI همان‌طور که پیکربندی شده (`apps/`) | ۱۵۷ | ۵۶۰۷ | ۳۲۵ | **۹۴٪** |
| دامنهٔ گسترده (`apps` + `config` + `scripts`) | — | ۶۰۸۳ | ۵۱۳ | **۹۲٪** |

خارج از دامنهٔ گیت: `config/` (۷۷۳ خط) و `scripts/` (۵۲۴ خط). با سنجشِ آن‌ها، تفکیک چنین است:

| فایل | پوشش | چرا |
|---|---|---|
| `config/settings/base.py` | ۹۸٪ | بخش عمدهٔ آن با بارگذاری تنظیمات اجرا می‌شود |
| `config/settings/dev.py` | ۷۹٪ | مسیرهای شرطیِ محیط توسعه |
| `config/urls.py` | ۷۵٪ | |
| `config/settings/production.py` | **۰٪** | CI از تنظیماتِ dev استفاده می‌کند، پس هرگز بارگذاری نمی‌شود |
| `config/asgi.py` / `config/wsgi.py` | **۰٪** | نقطهٔ ورود سرور؛ در تست اجرا نمی‌شود |
| `scripts/i18n.py` | **۵۸٪** | با وجودِ `test_i18n_tooling.py`، شاخه‌های CLI پوشش داده نشده‌اند |
| `scripts/generate_brand_assets.py` | **۰٪** | هیچ تستی ندارد |

`migrations` (۱۸ فایل / ۱۸۳۷ خط) حذف شده‌اند که **رویهٔ استاندارد** است: کدِ تولیدشدهٔ ماشین، نه منطق دست‌نویس.

**نتیجه برای بک‌اند:** هر دو عدد (۹۴٪ و ۹۲٪) بالای آستانهٔ ۸۵٪‌اند، پس شکافِ بک‌اند در برابر فرانت‌اند **کوچک و قابل‌دفاع** است.

#### ۶.۴.۶. لینت و تایپ‌چک چه دامنه‌ای دارند (برخلاف پوشش تست)

جملهٔ «تمام کدهای مخزن تحت لینت و تایپ‌چک هستند» **درست** است؛ فقط «تست» است که دامنهٔ محدود دارد. تفکیکِ راستی‌آزمایی‌شده:

| گیت | دامنهٔ واقعی | وضعیت |
|---|---|---|
| `tsc --noEmit` (فرانت) | `**/*.ts` و `**/*.tsx` → **کل `src`** شامل `ui-port` و `app` | ✅ کامل |
| `eslint` (فرانت) | کل پروژه | ✅ کامل |
| `prettier --check` (فرانت) | `src/**`، `e2e/**`، `messages/**` | ✅ کامل |
| `ruff check .` / `ruff format --check .` / `black --check .` (بک‌اند) | **همه‌چیز** شامل `scripts/` | ✅ کامل |
| `mypy apps config` (بک‌اند) | ۲۴۲ فایل — **`scripts/` را شامل نمی‌شود** | ⚠️ شکاف |

تنها شکافِ غیرپوششی: `backend/scripts/` (۵۲۴ خط) تایپ‌چک نمی‌شود، چون CI دستور `mypy apps config` را اجرا می‌کند نه `mypy .`.

#### ۶.۴.۷. کنترل‌های جبرانی — کدِ سنجیده‌نشده بی‌محافظ نیست

پوششِ تستِ واحد، تنها لایهٔ محافظ نیست. برای همان ۶۱ فایلِ سنجیده‌نشده، این گیت‌ها در CI اجرا می‌شوند:

- **۶۰ تست E2E در ۹ فایل** روی **Chromium واقعی** در سه پروژهٔ `fa` / `fa-locale` / `en`. بخش عمدهٔ این تست‌ها دقیقاً صفحات `src/app/**` و پوستهٔ `ui-port` را در مرورگر می‌آزمایند — همان‌جایی که پوشش واحد ۶٪ و ۲۱٪ است.
- **Lighthouse CI با حداقل امتیاز `۰٫۹۵`** در هر چهار محور روی **۶ نشانی** (`.lighthouserc.json`: `/`، `/en`، `/services`، `/blog`، `/projects/pentestor` و `/products/crm`)، فعال روی `main` و `workflow_dispatch`.
- **گارد دو‌طرفهٔ رنگ خام** (بستهٔ ۲، `hardcoded-colors.test.ts`): سقفِ کنونی **۱۷۷ لیترال در ۱۶ فایل** — بستهٔ ۶ آن را از ۳۶۰ در ۲۰ فایل پایین آورد — به‌همراه چهار استثنای صریح و دلیل‌دار (سه تای آن‌ها آبشارِ CSS ندارند: `global-error.tsx`، `not-found.tsx` و ماژولِ مشترکِ `brand-colors.ts` برای تصویر OG و صفحهٔ ۴۱۰؛ چهارمی `neural-network-3d.tsx` رنگ را به‌شکل عدد به Three.js/WebGL می‌دهد؛ `scannedTotal = ۲۰۰ = ۱۷۷ + ۲۳`). تفکیکِ ۱۷۷ لیترالِ باقی‌مانده (۱۵۱ بدونِ توکنِ هم‌مقدار + ۲۶ دارای توکن ولی مهاجرت‌ناپذیر) در CHANGELOG بستهٔ ۶ آمده است.
- `mypy` سخت‌گیرانه و `ruff` روی کل کد (بند ۶.۴.۶).

پس ریسک، «کدِ آزموده‌نشده» نیست؛ ریسک، **«کدی که تستِ واحدش در سطحِ تابع/شاخه اجرا نمی‌شود»** است. این تفاوت مهم است و باید در ارزیابی ریسک دقیق بماند.

#### ۶.۴.۸. وضعیت تصمیم

بستهٔ ۵ از برنامهٔ بازسازی هفت‌بسته‌ای («صداقتِ پوشش») قرار بود `src/components/ui-port/**/*.tsx` را به `coverage.include` اضافه کند. سه گزینه بررسی و اندازه‌گیری شد:

| گزینه | نتیجهٔ اندازه‌گیری‌شده |
|---|---|
| نوشتن تست تا رسیدن به آستانهٔ موجود | **با وزنِ اندازه‌گیری‌شده، ریاضی‌وار ناممکن است.** ‏`ui-port` سهمِ ۳۹٫۴٪ از statements را دارد، پس حتی رساندنش به **۱۰۰٪** میانگینِ کل را فقط به **۷۲٫۷۵٪** می‌رساند (برای ۸۵٪ به ۱۳۱٪ پوشش نیاز بود). رسیدن به ۸۵٪ مستلزمِ پوشاندنِ `src/app/**` هم هست: یا `ui-port` → ۱۰۰٪ **و** `src/app` → ۵۰٫۵٪، یا هر دو → ۸۵٪ که ۸۷٫۵۴٪ می‌دهد. گذشته از این، بخش عمدهٔ `ui-port` کامپوننت‌های نمایشی/انیمیشنی است ⇒ تستِ صرفاً درصدی، **تئاتر پوشش** می‌شد. رد شد |
| آستانهٔ تفکیک‌شده به‌تفکیک پوشه | با Vitest `5.0.3` سنجیده شد: آستانهٔ سراسری **همچنان بر همهٔ فایل‌ها اعمال می‌شود** و glob-های تفکیکی آن‌ها را از محاسبهٔ سراسری خارج **نمی‌کنند**. پیاده‌سازی‌پذیر است فقط اگر آستانهٔ سراسری هم روی عددِ صادقانه تنظیم شود |
| ورود به گزارش بدون گیت | عدد صادقانه می‌شود ولی هیچ قفلی روی آن نیست |

**تصمیم مالک (۲۰۲۶-۱۰-۲۰):** بستهٔ ۵ **پیش از استقرار به تعویق افتاد** (محدودیت زمانی). در نتیجه:

- `coverage.include` و `thresholds` **دست‌نخورده باقی ماندند**. هیچ آستانه‌ای پایین آورده نشد (قانون ۱۹ رعایت شد).
- **هیچ تغییری در CI لازم نبود**: گیت با دامنهٔ موجود سبز و سازگار است.
- تعهدِ جایگزین، **همین بند** است: به‌جای تغییرِ گیت، دامنهٔ واقعیِ آن به‌طور کامل افشا می‌شود تا هیچ عددی بدونِ زمینه نقل نشود.
- این یک **بدهی فنیِ پذیرفته‌شدهٔ آگاهانه** است، نه یک وضعیتِ ناخواسته. هر بازنگریِ آینده باید از اعدادِ همین بند شروع کند، نه از ۹۸٪.

#### ۶.۴.۹. بازتولید اعداد

```bash
# فرانت‌اند — عددِ گیت (دقیقاً همان چیزی که CI اجرا می‌کند)
cd frontend && npm run test:coverage          # → ۹۸٫۰۸ / ۷۸٫۳۱ / ۹۸٫۲۲ / ۹۸٫۶۸

# بک‌اند — عددِ گیت
cd backend && PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest --create-db -q && coverage report --fail-under=85
#                                                          → ۵۶۰۷ stmt / ۳۲۵ missed / ۹۴٪

# بک‌اند — دامنهٔ گسترده
coverage run --source=apps,config,scripts -m pytest --create-db -q && coverage report --fail-under=0
#                                                          → ۶۰۸۳ stmt / ۵۱۳ missed / ۹۲٪

# تعداد تست‌های E2E (منبع معتبر، نه شمارش با grep)
cd frontend && npx playwright test --list      # → Total: 60 tests in 9 files
```

عددِ **کلِ `src`** (۴۱٫۶۷٪) بخشی از CI نیست و با یک پیکربندیِ موقتِ دوراندیش گرفته شد که کامیت **نشده** است: `coverage.include` به `["src/**/*.ts", "src/**/*.tsx"]` و همهٔ `thresholds` به صفر تغییر یافت، سپس `npx vitest run --coverage` اجرا شد. برای تکرار، همین دو تغییر را موقتاً در `vitest.config.mts` اعمال کنید و بعد برگردانید.

> **هشدارِ روش‌سنجی:** شمارشِ تست‌ها با `grep -c 'test('` عددِ **۶۳** می‌دهد که **غلط** است؛ تنها منبع معتبر `npx playwright test --list` است. به‌طور مشابه، پوششِ یک پوشه را باید از یک گزارشِ واحد گرفت: گلوبِ `**/*.tsx` به‌تنهایی برای `ui-port` عددِ ۱۳٫۲۴٪ می‌دهد که فایل‌های `.ts` همان پوشه را جا می‌اندازد.
