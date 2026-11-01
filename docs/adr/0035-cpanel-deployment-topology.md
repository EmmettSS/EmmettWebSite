# ADR-0035: توپولوژی و معماری استقرار روی هاست اشتراکی ایرانی cPanel

**وضعیت:** پذیرفته‌شده — واگذاری مالک محصول در 2026-10-06 (فاز ۸: Quality & Docs)<br>
**تاریخ:** 2026-10-06<br>
**دامنه:** فاز ۸ (استقرار Production روی cPanel)<br>
**مرتبط با:** ADR-0001, 0005, 0006, 0010, 0011, 0031, 0032, 0033<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

مأموریت پروژه، استقرار یک وب‌سایت دوزبانه با فرانت‌اند Next.js (SSR) و بک‌اند Django/DRF با دیتابیس MySQL روی **هاست اشتراکی ایرانی cPanel** (مجهز به Phusion Passenger برای Python و Node.js، بدون Redis/Celery و بدون دسترسی root/Docker) است. لازم است توپولوژی دقیق مسیردهی، مدیریت پردازه‌ها، فایل‌های استاتیک/مدیا و زمان‌بندی Cron Jobها به‌صورت قطعی مستند و استاندارد شود.

## ۲. گزینه‌ها

| گزینه | توضیح | مزایا | معایب | وضعیت |
|---|---|---|---|---|
| **A. دامنهٔ واحد هم‌مبدأ (Same-Origin Single Domain)** | Node.js/Next.js در ریشهٔ دامنه (`/`) و Python/Django در mount اختصاصی cPanel برابر `/backend`؛ `/api/v1/*` از Route Handler در Next به `https://<canonical-host>/backend/api/v1/*` می‌رود؛ ادمین در `/backend/admin/` و `i18n` در `/backend/i18n/` است | بدون CORS بین مرورگر و API، کوکی‌های `SameSite=Lax` و CSRF هم‌مبدأ، یک گواهی TLS | نیازمند پشتیبانی Passenger/cPanel از Node در `/` و Python در `/backend`؛ قوانین Passenger را cPanel می‌سازد و نباید با `.htaccess` دستی جایگزین کرد | **انتخاب‌شده (الگوی مرجع اصلی)** |
| **B. ساب‌دامنهٔ مجزا برای بک‌اند (`api.emmett.ir`)** | فرانت‌اند روی `emmett.ir` (Node.js App) و بک‌اند/ادمین روی `api.emmett.ir` (Python WSGI App) | جداسازی کامل در cPanel | تغییر env و بازبینی CSRF/CORS لازم است | **انتخاب نشده؛ فقط با تصویب جداگانهٔ مالک محصول** |
| **C. خروجی استاتیک Next (`output: export`)** | بیلد استاتیک بدون سرور Node.js | عدم نیاز به Node.js App | نقض نیازمندی‌های پروژه: از دست رفتن SSR پویا، CSP با nonce یکتا در هر درخواست، `sitemap.xml` پویا و OG Image پویا | رد شده |

## ۳. تصمیم

### الف) توپولوژی مرجع (دامنهٔ واحد + دو اپلیکیشن Passenger)
1. **اپلیکیشن Python — بک‌اند Django (`Setup Python App` در cPanel):**
   - نسخهٔ پایتون: `3.11`؛ ریشه: `/home/<cpanel_user>/EmmettWebSite/backend`؛ فایل ورودی: `passenger_wsgi.py`؛ entry point: `application`.
   - **Application URL: `/backend`** (نه `/admin` و نه پورت فرضی `127.0.0.1:8000`). این mount با `DJANGO_FORCE_SCRIPT_NAME=/backend` در Environment Variables همان Python App هم‌تراز می‌شود؛ در صورت نیاز مقدار جداگانه‌ای برای CLI/Cron در env خصوصی سرور قرار می‌گیرد. مسیرهای عمومی Django در نتیجه `/backend/admin/`, `/backend/i18n/` و `/backend/api/v1/` هستند.
   - استاتیک Django با WhiteNoise/`STATIC_ROOT=backend/staticfiles` و مدیا با مسیر `/media/` و `.htaccess` مخصوص media سرو می‌شوند.
2. **اپلیکیشن Node.js — فرانت‌اند Next.js (`Setup Node.js App` در cPanel):**
   - نسخهٔ Node: دقیقاً `22.22.3` (مطابق `frontend/package.json` و CI)؛ ریشه: `/home/<cpanel_user>/EmmettWebSite/frontend`؛ فایل ورودی Passenger: `server.js`؛ **Application URL: ریشهٔ دامنه (`/`)** و `PORT` از Passenger گرفته می‌شود.
   - مرورگر فقط `/api/v1/*` را روی همان مبدأ فراخوانی می‌کند؛ Next آن را به mount جنگو پراکسی می‌کند. مقدار مرجع `INTERNAL_API_URL=https://emmett.ir/backend` است و برای دامنهٔ دیگر باید با host canonical جایگزین شود. همین مقدار برای Server Components و Route Handler استفاده می‌شود.
   - `FRONTEND_REVALIDATE_URL=https://emmett.ir/api/revalidate` برای تماس Django با Next است؛ secret مشترک فقط در env سرورهای Django و Node نگه‌داری می‌شود.
3. **مالکیت مسیریابی:** cPanel/Passenger قواعد route لازم را هنگام ساخت اپ‌ها مدیریت می‌کند. نمونهٔ `public_html.htaccess.example` فقط قواعد تکمیلی امنیتی است و نباید فایل `.htaccess` مدیریت‌شدهٔ cPanel را کامل overwrite کند.

### ب) دیتابیس و کش روی cPanel
- **دیتابیس:** MySQL 8.0+ در بخش `MySQL Databases` سی‌پنل با مجموعه کاراکتر `utf8mb4` و collation `utf8mb4_unicode_ci`؛ اتصال از طریق درایور خالص پایتون `PyMySQL` (بدون نیاز به `mysqlclient` و کامپایلر C روی هاست اشتراکی — `ADR-0011`).
- **کش:** `FileBasedCache` در مسیر `/home/<cpanel_user>/tmp/emmett-django-cache` با دسترسی `0700`، مشترک بین کارگرهای Passenger بدون نیاز به Redis (`ADR-0006`).

### ج) وظایف زمان‌بندی‌شده (cPanel Cron Jobs)
به‌جای Celery/Redis، سه Cron Job استاندارد در cPanel تنظیم می‌شوند:
1. **پشتیبان‌گیری خودکار روزانه (ساعت ۰۳:۳۰ بامداد):**
   `python manage.py backup_db --keep 7`
2. **هرس لاگ عملیاتی AI (هفتگی، یکشنبه‌ها ساعت ۰۴:۰۰ بامداد):**
   `python manage.py purge_ai_audit`
3. **تولید پیش‌نویس خلاصهٔ مقالات جدید (روزانه، در صورت فعال بودن AI):**
   `python manage.py generate_blog_summaries`

## ۴. پیامدها

- **مثبت:** به Docker، کامپایلر C، Redis یا دسترسی root وابسته نیست؛ بااین‌حال پشتیبانی حساب cPanel مشخص از دو Application URL هم‌زمان `/` و `/backend` باید پیش از Go-Live تأیید شود.
- **جایگزینِ نیازمند تصمیم مجدد:** اگر ارائه‌دهنده نتواند دو Passenger App را روی یک دامنه در URLهای `/` و `/backend` route کند، استقرار متوقف می‌ماند تا مالک محصول توپولوژی ساب‌دامنه را جداگانه تأیید کند؛ در آن حالت `DJANGO_FORCE_SCRIPT_NAME` و `INTERNAL_API_URL` باید مطابق آن پیکربندی بازتنظیم شوند.
- **دروازهٔ استقرار:** این ADR قرارداد هدف مخزن را تثبیت می‌کند، نه سازگاری اثبات‌شده با حساب هاست خاص. پیش از Go-Live باید از ترمینال همان هاست، هر دو health URL مستقیم و proxied و مسیر login ادمین بررسی شوند. پورت `127.0.0.1:8000` هیچ‌وقت در production فرض نمی‌شود.
