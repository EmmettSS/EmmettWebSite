# ADR-0036: بستهٔ نهایی آمادگی استقرار (Deployment Readiness)، قفل کامل وابستگی‌ها و اسکریپت‌های عملیاتی cPanel

- **وضعیت:** تصویب‌شده (فاز ۹)
- **تاریخ:** ۲۰۲۶-۱۰-۰۶
- **تصمیم‌گیرندگان:** مالک محصول، ایجنت ارشد توسعه (Principal Engineer / DevOps & Security Specialist)

---

## ۱. زمینه (Context)

در فازهای ۱ تا ۸، تمامی اجزای فرانت‌اند (`Next.js 16 SSR`)، بک‌اند (`Django 5.2 + DRF`)، موتور هوش مصنوعی (`ai_engine`)، پنل مدیریت SaaS، سئو، امنیت و پایپ‌لاین CI/CD ساخته و آزمایش شدند. در فاز ۹ (Deployment Readiness) هدف آن است که یک **بستهٔ عملیاتی آمادهٔ استقرار روی هاست اشتراکی ایرانی cPanel** تحویل داده شود تا مالک محصول بتواند بدون ابهام و بدون خطای انسانی، پروژه را روی سرور واقعی بالا بیاورد، به‌روزرسانی کند و در شرایط بحرانی بازیابی نماید.

پیش از شروع کدنویسی فاز ۹، چهار سؤال کلیدی از مالک محصول پرسیده شد و پاسخ‌های زیر دریافت گردید:
1. **توپولوژی مسیردهی روی cPanel:** فقط الگوی **دامنهٔ واحد هم‌مبدأ (`single_domain_only`)**.
2. **محل قرارگیری فایل‌های ورودی Passenger:** فقط به‌صورت فایل‌های نمونه (`.example`) در پوشه‌های `deploy/` (`example_only`) و کپی دستی طبق راهنما.
3. **دامنهٔ اسکریپت‌های خودکار استقرار:** مجموعهٔ کامل اسکریپت‌های استقرار بک‌اند، استقرار فرانت‌اند و بازیابی بکاپ (`full_scripts_suite`).
4. **استراتژی Pin کردن `backend/requirements.txt`:** قفل کامل تمام پکیج‌های مستقیم و زیر-وابستگی‌های زمان اجرا با `==` به‌همراه تست خودکار (`full_pinned_lock`).

---

## ۲. گزینه‌ها (Options)

### الف) مدیریت وابستگی‌های پروداکشن (`requirements.txt`)
1. نگه‌داشتن فقط ۲۰ پکیج سطح اول با `==` و اجازه به `pip` برای انتخاب آخرین نسخهٔ زیر-وابستگی‌ها در زمان نصب روی cPanel.
2. **قفل کامل (Full Pinning) تمام ۲۰ پکیج مستقیم و ۲۰ زیر-وابستگی زمان اجرا (Transitive Runtime Dependencies) با `==` + تست ساختاری در `pytest` (گزینهٔ انتخابی).**

### ب) تنظیمات پروداکشن (`config/settings/production.py`)
1. نگه‌داشتن تنظیمات حداقلی فعلی در `production.py`.
2. **تکمیل نهایی `production.py` و `base.py` (گزینهٔ انتخابی):** شامل قفل `DEBUG = False`، بررسی سلامت اتصال MySQL (`CONN_HEALTH_CHECKS = True` برای جلوگیری از خطای `MySQL server has gone away` در هاست اشتراکی)، تنظیمات کامل کوکی‌ها (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE`, `CSRF_COOKIE_SAMESITE`)، هدرهای `SECURE_HSTS_*`, `SECURE_SSL_REDIRECT`, `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_CROSS_ORIGIN_OPENER_POLICY`، پیکربندی `STORAGES` استاندارد Django 5.2 با WhiteNoise، مسیرهای قابل‌تنظیم `DJANGO_STATIC_ROOT` و `DJANGO_MEDIA_ROOT` از `.env`، و تنظیمات کامل SMTP برای ارسال ایمیل در پروداکشن.

### ج) اسکریپت‌های عملیاتی و فایل‌های نمونهٔ Passenger
1. اجرای دستی تک‌تک دستورات در ترمینال cPanel.
2. **ارائهٔ سه اسکریپت Bash ایمن و ایدمپوتنت (`scripts/deploy_backend.sh`, `scripts/deploy_frontend.sh`, `scripts/restore_backup.sh`) + فایل‌های نمونهٔ `.example` در `backend/deploy/` و `frontend/deploy/` (گزینهٔ انتخابی).**

---

## ۳. تصمیم (Decision)

1. **قفل ۱۰۰٪ `backend/requirements.txt`:** تمام ۴۰ پکیج پروداکشن (۲۰ پکیج سطح اول + ۲۰ زیر-وابستگی زمان اجرا) با عملگر دقیق `==` پین می‌شوند و هیچ پکیج جدیدی به درخت وابستگی اضافه نمی‌شود (رعایت قانون ۶). یک تست خودکار در `backend/apps/core/tests/test_deployment_readiness.py` تضمین می‌کند که هر خط غیرکامنت در `requirements.txt` دارای `==` است.
2. **نهایی‌سازی `backend/config/settings/production.py` و `.env.example`:**
   - افزودن `CONN_HEALTH_CHECKS = True` و `init_command: "SET sql_mode='STRICT_TRANS_TABLES'"` روی دیتابیس MySQL پروداکشن؛
   - افزودن `STORAGES` استاندارد Django 5.2 (`CompressedManifestStaticFilesStorage`) و پشتیبانی از متغیرهای `DJANGO_STATIC_ROOT` و `DJANGO_MEDIA_ROOT` در `.env` برای هم‌ترازی آسان با `public_html/static` و `public_html/media` در cPanel؛
   - افزودن متغیرهای کامل SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`) در `base.py` و `backend/.env.example`؛
   - ایجاد `frontend/.env.example` برای مستندسازی متغیرهای محیطی اپلیکیشن Node.js در cPanel.
3. **فایل‌های نمونهٔ Passenger فقط با پسوند `.example`:**
   - `backend/deploy/passenger_wsgi.py.example` برای `Setup Python App`؛
   - `frontend/deploy/server.js.example` برای `Setup Node.js App` روی Phusion Passenger؛
   - `backend/deploy/public_html.htaccess.example` برای مسیردهی دامنهٔ واحد هم‌مبدأ؛
   - `backend/deploy/media.htaccess.example` برای مسدودسازی اجرای اسکریپت در پوشهٔ آپلودها.
4. **اسکریپت‌های اجرایی در `scripts/`:**
   - `scripts/deploy_backend.sh`: بررسی وجود `.env` پروداکشن، ساخت دایرکتوری‌های `media`, `backups`, `.cache` با دسترسی `700`، کپی `media/.htaccess`، اجرای `migrate --noinput`، کامپایل و بررسی ترجمه‌ها (`scripts/i18n.py check`)، اجرای `collectstatic --noinput`، اجرای `manage.py check --deploy` و ری‌استارت بدون قطعی Passenger (`touch tmp/restart.txt`).
   - `scripts/deploy_frontend.sh`: نصب وابستگی‌های قفل‌شده (`npm ci`)، اجرای `npm run build` با متغیرهای محیطی پروداکشن، و ری‌استارت Passenger (`touch tmp/restart.txt`).
   - `scripts/restore_backup.sh`: بازیابی ایمن دیتابیس (`.sqlite3.gz`, `.sql.gz`, یا `.json.gz`) و آرشیو `media-*.tar.gz` همراه با بررسی وجود فایل و ساخت بکاپ ایمنی پیش از بازنویسی.
5. **راهنمای جامع فارسی `DEPLOYMENT.md` در ریشهٔ مخزن:** شامل راهنمای گام‌به‌گام cPanel در توپولوژی دامنهٔ واحد، راهنمای کامل متغیرهای محیطی، راهنمای بکاپ و بازیابی، و چک‌لیست Go-Live.

---

## ۴. پیامدها (Consequences)

- **مثبت:** نصب پکیج‌ها روی هاست اشتراکی cPanel کاملاً تکرارپذیر و مصون از شکست‌های ناشی از انتشار نسخه‌های ناسازگار زیر-وابستگی‌ها است؛ اسکریپت‌های استقرار تمام گام‌های حساس (`migrate`, `collectstatic`, `i18n check`, `check --deploy`, `tmp/restart.txt`) را استاندارد و خودکار می‌کنند.
- **محدودیت و نگهداشت:** هنگام ارتقای هر پکیج در آینده، نسخهٔ زیر-وابستگی‌های متناظر نیز باید در `backend/requirements.txt` به‌روزرسانی شود (تست خودکار در CI این انطباق را کنترل می‌کند).
