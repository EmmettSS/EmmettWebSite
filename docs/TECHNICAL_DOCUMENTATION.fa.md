# مستندات فنی جامع پروژهٔ امیت (Emmett Software Development Group) — نسخهٔ فارسی

> **نوع سند:** مرجع فنی یکپارچه و جامع (Single-File Technical Documentation — فارسی)  
> **نسخهٔ انگلیسی:** [`docs/TECHNICAL_DOCUMENTATION.en.md`](./TECHNICAL_DOCUMENTATION.en.md)  
> **پوشش:** معماری سیستم، مدل داده، خلاصهٔ ۳۵ ADR، مستندات کامل API، راهنمای کامل پنل ادمین، راهنمای گام‌به‌گام استقرار روی cPanel، و دروازه‌های کیفیت/CI-CD.

---

## فهرست مطالب

1. [بخش اول: معماری کلان سیستم و مدل داده](#بخش-اول-معماری-کلان-سیستم-و-مدل-داده)
2. [بخش دوم: فهرست و خلاصهٔ تصمیمات معماری (ADR-0001 تا ADR-0035)](#بخش-دوم-فهرست-و-خلاصهٔ-تصمیمات-معماری-adr-0001-تا-adr-0035)
3. [بخش سوم: مستندات کامل API (OpenAPI / REST v1)](#بخش-سوم-مستندات-کامل-api-openapi--rest-v1)
4. [بخش چهارم: راهنمای جامع پنل مدیریت (Admin Guide)](#بخش-چهارم-راهنمای-جامع-پنل-مدیریت-admin-guide)
5. [بخش پنجم: راهنمای گام‌به‌گام استقرار روی هاست اشتراکی cPanel](#بخش-پنجم-راهنمای-گام‌به‌گام-استقرار-روی-هاست-اشتراکی-cpanel)
6. [بخش ششم: دروازه‌های کیفیت، تست، Pre-commit و پایپ‌لاین CI/CD](#بخش-ششم-دروازه‌های-کیفیت-تست-pre-commit-و-پایپ‌لاین-cicd)

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
  - **Server Components:** مستقیماً از سرور Next.js به `INTERNAL_API_URL` (پیش‌فرض `http://127.0.0.1:8000`) با هدر `Accept-Language` و کش `revalidate` درخواست می‌زنند.
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
| `portfolio` | نمونه‌کارها، محصولات (`is_product=True` مانند Pentestor و CRM) و مطالعات موردی ۷بخشی | `Project`, `CaseStudy` |
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

## بخش دوم: فهرست و خلاصهٔ تصمیمات معماری (ADR-0001 تا ADR-0035)

تمام تصمیمات معماری در مسیر `docs/adr/` مستند شده‌اند:

| کد ADR | عنوان تصمیم | خلاصهٔ تصمیم مصوب |
|---|---|---|
| **ADR-0001** | معماری کلان سیستم | مونو-ریپو شامل Next.js (SSR) در `frontend/` و Django/DRF در `backend/` قابل استقرار روی cPanel |
| **ADR-0002** | مرزبندی اپ‌های Django | معماری Modular Monolith با ۱۱ اپ دامنه‌ای مستقل و لایهٔ تجمیع `api` |
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
| `GET` | `/api/v1/health/` | عمومی | بررسی سلامت دیتابیس و کش (`{"status": "ok", "database": "ok", "cache": "ok"}`) |
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

- تمام ۲۰ مدل دارای کلاس صریح `Resource` در `apps/<app>/resources.py` هستند (`ADR-0029`).
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
   - **Application URL:** در الگوی دامنهٔ واحد می‌توانید مسیر پایهٔ وب‌سرور یا در الگوی ساب‌دامنه، `api.emmett.ir` را انتخاب کنید.
   - **Application startup file:** `passenger_wsgi.py`
   - **Application Entry point:** `application`
2. دستور فعال‌سازی محیط مجازی نمایش‌داده‌شده در بالای صفحهٔ Setup Python App را کپی و در ترمینال اجرا کنید:
   ```bash
   source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
   cd ~/EmmettWebSite/backend
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. فایل `.env` پروداکشن را در `~/EmmettWebSite/backend/.env` بسازید (`chmod 600 .env`):
   ```ini
   DJANGO_SETTINGS_MODULE=config.settings.production
   DJANGO_SECRET_KEY=<یک-رشته-تصادفی-۶۴-کاراکتری-امن>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=emmett.ir,www.emmett.ir,127.0.0.1,localhost

   MYSQL_DATABASE=cpaneluser_emmett
   MYSQL_USER=cpaneluser_app
   MYSQL_PASSWORD=<رمز-دیتابیس>
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306

   CACHE_BACKEND=filebased
   CACHE_LOCATION=/home/<cpanel_user>/EmmettWebSite/backend/.cache/django-cache

   PUBLIC_SITE_URL=https://emmett.ir
   DJANGO_CSRF_TRUSTED_ORIGINS=https://emmett.ir,https://www.emmett.ir
   DJANGO_SECURE_SSL_REDIRECT=True
   DJANGO_SESSION_COOKIE_SECURE=True
   DJANGO_CSRF_COOKIE_SECURE=True

   DJANGO_CSP_ENABLED=True
   DJANGO_FRAME_ANCESTORS='none'
   ADMIN_2FA_REQUIRED=True
   LOGIN_LOCKOUT_ENABLED=True

   BACKUP_DIR=/home/<cpanel_user>/EmmettWebSite/backend/backups
   BACKUP_RETENTION=7
   BACKUP_INCLUDE_MEDIA=True

   KAVENEGAR_API_KEY=<کلید-کاوه‌نگار-در-صورت-استفاده>
   KAVENEGAR_SENDER=<خط-ارسال‌کننده>
   AI_ENABLED=false
   ```
4. دستورات مهاجرت دیتابیس، جمع‌آوری استاتیک، بررسی ترجمه و بررسی امنیتی پروداکشن را اجرا کنید:
   ```bash
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   python scripts/i18n.py check
   python manage.py check --deploy
   python manage.py createsuperuser
   ```
5. در صفحهٔ **Setup Python App** دکمهٔ **Restart** را بزنید.

### ۵.۵. گام ۴: بیلد و راه‌اندازی فرانت‌اند Next.js (`Setup Node.js App`)

1. در cPanel وارد **Setup Node.js App** شوید و روی **Create Application** کلیک کنید:
   - **Node.js version:** `22.x`
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** `emmett.ir`
   - **Application startup file:** `node_modules/next/dist/bin/next` (با آرگومان `start` یا از طریق اسکریپت `npm start`)
2. متغیرهای محیطی زیر را در بخش **Environment variables** اپلیکیشن Node.js اضافه کنید:
   - `NODE_ENV` = `production`
   - `PUBLIC_SITE_URL` = `https://emmett.ir`
   - `INTERNAL_API_URL` = آدرس داخلی یا ساب‌دامنهٔ سرویس Django (مثلاً `http://127.0.0.1:8000` یا `https://api.emmett.ir`)
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

- [ ] فراخوانی `https://emmett.ir/api/v1/health/` کد `200 OK` و `{"status": "ok"}` برمی‌گرداند.
- [ ] خروجی `python manage.py check --deploy` هیچ خطا یا هشدار امنیتی (`W007`–`W013`) ندارد.
- [ ] ورود به `https://emmett.ir/admin/` کاربر staff را به راه‌اندازی 2FA (`/admin/2fa/setup`) هدایت می‌کند و کدهای بازیابی در جای امن ذخیره شده‌اند.
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
coverage run -m pytest -q && coverage report --fail-under=85 -m     # اجرای تست‌ها با شرط پوشش ≥ ۸۵٪
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
