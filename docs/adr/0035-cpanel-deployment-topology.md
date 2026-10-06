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
| **A. دامنهٔ واحد هم‌مبدأ (Same-Origin Single Domain)** | دامنهٔ اصلی (`https://emmett.ir`) روی اپلیکیشن Node.js (Next.js) قرار می‌گیرد؛ درخواست‌های `/api/*` از طریق Route Handler داخلی Next به پورت/سوکت داخلی Django پراکسی می‌شوند و مسیرهای `/admin/*`, `/i18n/*`, `/static/*`, `/media/*` در `.htaccess` مستقیماً به اپ WSGI جنگو و دیسک هدایت می‌شوند | بدون پیچیدگی CORS، کوکی‌های `SameSite=Lax` و CSRF کاملاً هم‌مبدأ، یک گواهی SSL واحد، همسان با معماری تست/توسعه | نیازمند تنظیم دقیق `.htaccess` برای تفکیک مسیرهای ادمین/استاتیک از فرانت | **انتخاب‌شده (الگوی مرجع اصلی)** |
| **B. ساب‌دامنهٔ مجزا برای بک‌اند (`api.emmett.ir`)** | فرانت‌اند روی `emmett.ir` (Node.js App) و بک‌اند/ادمین روی `api.emmett.ir` (Python WSGI App) | جداسازی کامل در cPanel بدون `.htaccess` ترکیبی | نیازمند تنظیم `CORS_ALLOWED_ORIGINS` و `CSRF_TRUSTED_ORIGINS` بین دو ساب‌دامنه (مگر اینکه کلاینت همچنان از پراکسی `/api/` خود Next استفاده کند) | **پشتیبانی‌شده به‌عنوان الگوی جایگزین** |
| **C. خروجی استاتیک Next (`output: export`)** | بیلد استاتیک بدون سرور Node.js | عدم نیاز به Node.js App | نقض نیازمندی‌های پروژه: از دست رفتن SSR پویا، CSP با nonce یکتا در هر درخواست، `sitemap.xml` پویا و OG Image پویا | رد شده |

## ۳. تصمیم

### الف) توپولوژی مرجع (دامنهٔ واحد + دو اپلیکیشن Passenger)
1. **اپلیکیشن اول — بک‌اند Django (`Setup Python App` در cPanel):**
   - نسخهٔ پایتون: `Python 3.11`؛
   - ریشهٔ اپلیکیشن: `/home/<cpanel_user>/EmmettWebSite/backend`؛
   - فایل ورودی WSGI: `passenger_wsgi.py` (که `config.wsgi:application` را با `DJANGO_SETTINGS_MODULE=config.settings.production` بارگذاری می‌کند)؛
   - سرو فایل‌های استاتیک جنگو/ادمین با `WhiteNoise` (`STATIC_ROOT = backend/staticfiles`) و سرو فایل‌های `media/` مستقیم توسط Apache با فایل امنیتی `media/.htaccess` (`php_flag engine off`, `Options -ExecCGI -Indexes`).
2. **اپلیکیشن دوم — فرانت‌اند Next.js (`Setup Node.js App` در cPanel):**
   - نسخهٔ نود: `Node.js 22 LTS`؛
   - ریشهٔ اپلیکیشن: `/home/<cpanel_user>/EmmettWebSite/frontend`؛
   - فایل ورودی استارت‌آپ Passenger: `server.js` (راه‌انداز استاندارد Next.js در حالت production)؛
   - متغیر `INTERNAL_API_URL` به آدرس داخلی سرویس Django تنظیم می‌شود تا هم Server Components و هم Route Handler پراکسی (`/api/[...path]`) بدون خروج از شبکهٔ محلی سرور با Django ارتباط برقرار کنند.

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

- **مثبت:** استقرار کاملاً منطبق با امکانات استاندارد هاست‌های اشتراکی ایرانی cPanel است و هیچ وابستگی به Docker، کامپایلر C، Redis یا دسترسی root ندارد.
- **مثبت:** در صورت محدودیت هاست در تعریف دو اپ Passenger روی یک دامنه، الگوی جایگزین ساب‌دامنه (`api.domain.ir` برای WSGI و `domain.ir` برای Node.js با `INTERNAL_API_URL=https://api.domain.ir`) بدون تغییر حتی یک خط کد و صرفاً با تغییر `.env` کار می‌کند.
