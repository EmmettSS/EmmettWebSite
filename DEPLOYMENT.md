# راهنمای جامع استقرار روی هاست اشتراکی cPanel (`DEPLOYMENT.md`)

> **فاز ۹ — آمادگی استقرار (Deployment Readiness)**  
> **توپولوژی مصوب (`ADR-0035` و `ADR-0036`):** دامنهٔ واحد هم‌مبدأ (`Single-Domain Same-Origin`) روی هاست اشتراکی لینوکسی مجهز به **cPanel + Phusion Passenger (Python 3.11 & Node.js 22) + MySQL 8**.

---

## فهرست مطالب

1. [معماری استقرار دامنهٔ واحد روی cPanel](#۱-معماری-استقرار-دامنهٔ-واحد-روی-cpanel)
2. [وابستگی‌های Pin شده (`backend/requirements.txt`)](#۲-وابستگی‌های-pin-شده-backendrequirementstxt)
3. [راهنمای گام‌به‌گام راه‌اندازی اولیه روی cPanel](#۳-راهنمای-گام‌به‌گام-راه‌اندازی-اولیه-روی-cpanel)
   - [گام ۳.۱: ساخت دیتابیس و کاربر MySQL 8](#گام-۳۱-ساخت-دیتابیس-و-کاربر-mysql-8)
   - [گام ۳.۲: دریافت کد پروژه در هاست](#گام-۳۲-دریافت-کد-پروژه-در-هاست)
   - [گام ۳.۳: راه‌اندازی بک‌اند در Setup Python App و Virtualenv](#گام-۳۳-راه‌اندازی-بک‌اند-در-setup-python-app-و-virtualenv)
   - [گام ۳.۴: تنظیم مسیرهای Static و Media و فایل‌های `.htaccess`](#گام-۳۴-تنظیم-مسیرهای-static-و-media-و-فایل‌های-htaccess)
   - [گام ۳.۵: راه‌اندازی فرانت‌اند در Setup Node.js App](#گام-۳۵-راه‌اندازی-فرانت‌اند-در-setup-nodejs-app)
   - [گام ۳.۶: ثبت Cron Jobها (بکاپ خودکار و نگهداری AI)](#گام-۳۶-ثبت-cron-jobها-بکاپ-خودکار-و-نگهداری-ai)
4. [اسکریپت‌های خودکار استقرار، `collectstatic` و `migrate`](#۴-اسکریپت‌های-خودکار-استقرار-collectstatic-و-migrate)
5. [راهنمای کامل متغیرهای محیطی (`.env.example`)](#۵-راهنمای-کامل-متغیرهای-محیطی-envexample)
6. [راهنمای پشتیبان‌گیری (Backup) و بازیابی بحران (Restore)](#۶-راهنمای-پشتیبان‌گیری-backup-و-بازیابی-بحران-restore)
7. [چک‌لیست نهایی Go-Live و عیب‌یابی](#۷-چک‌لیست-نهایی-go-live-و-عیب‌یابی)

---

## ۱. معماری استقرار دامنهٔ واحد روی cPanel

در الگوی **دامنهٔ واحد هم‌مبدأ (`Single-Domain`)**، تمام ترافیک کاربران روی یک دامنهٔ اصلی (مثلاً `https://emmett.ir`) سرو می‌شود و هیچ نیازی به CORS یا ساب‌دامنهٔ جداگانه نیست:

```
                   ┌──────────────────────────────────────────────────────────┐
                   │        HTTPS Request → https://emmett.ir                 │
                   │        Apache / LiteSpeed + Phusion Passenger            │
                   └──────────────┬───────────────────────────┬───────────────┘
                                  │                           │
       مسیرهای صفحات عمومی و API  │                           │ مسیرهای پنل مدیریت و فایل‌ها
       (/, /en/*, /api/v1/*)      ▼                           ▼ (/admin/*, /i18n/*, /static/*, /media/*)
┌─────────────────────────────────────────┐       ┌─────────────────────────────────────────┐
│  Setup Node.js App (Next.js 16 SSR)     │       │  Setup Python App (Django 5.2 WSGI)     │
│  ریشه: ~/EmmettWebSite/frontend         │       │  ریشه: ~/EmmettWebSite/backend          │
│  فایل ورودی: server.js                  │──────▶│  فایل ورودی: passenger_wsgi.py          │
│  پراکسی داخلی: /api/[...path]/route.ts  │ HTTP  │  تنظیمات: config.settings.production    │
└─────────────────────────────────────────┘       └────────────────────┬────────────────────┘
                                                                       │
                                                                       ▼
                                                  ┌─────────────────────────────────────────┐
                                                  │  MySQL 8 (utf8mb4_unicode_ci)           │
                                                  │  + FileBasedCache (.cache/django-cache) │
                                                  └─────────────────────────────────────────┘
```

### ساختار پوشه‌ها روی هاست cPanel (`/home/<cpanel_user>/`)

```text
/home/<cpanel_user>/
├── EmmettWebSite/
│   ├── DEPLOYMENT.md
│   ├── scripts/
│   │   ├── deploy_backend.sh         # اسکریپت خودکار migrate + collectstatic + i18n + check --deploy
│   │   ├── deploy_frontend.sh        # اسکریپت خودکار npm ci + next build + restart
│   │   └── restore_backup.sh         # اسکریپت بازیابی دیتابیس و مدیا از بکاپ
│   ├── backend/
│   │   ├── .env                      # متغیرهای محیطی پروداکشن (chmod 600 — خارج از Git)
│   │   ├── passenger_wsgi.py         # کپی‌شده از deploy/passenger_wsgi.py.example
│   │   ├── backups/                  # محل ذخیرهٔ بکاپ‌های روزانه (chmod 700 — خارج از public_html)
│   │   ├── .cache/django-cache/      # کش فایل‌محور جنگو (chmod 700 — خارج از public_html)
│   │   ├── staticfiles/              # خروجی collectstatic
│   │   └── media/                    # آپلودهای کاربران + فایل محافظ .htaccess
│   └── frontend/
│       └── server.js                 # کپی‌شده از deploy/server.js.example
└── public_html/
    ├── .htaccess                     # کپی‌شده از backend/deploy/public_html.htaccess.example
    ├── static -> ~/EmmettWebSite/backend/staticfiles   # سیم‌لینک (یا مسیر مستقیم DJANGO_STATIC_ROOT)
    └── media  -> ~/EmmettWebSite/backend/media         # سیم‌لینک (یا مسیر مستقیم DJANGO_MEDIA_ROOT)
```

---

## ۲. وابستگی‌های Pin شده (`backend/requirements.txt`)

در فایل `backend/requirements.txt` تمام **۴۰ پکیج پروداکشن** (شامل ۲۰ پکیج مستقیم سطح اول و ۲۰ زیر-وابستگی زمان اجرا) با عملگر دقیق `==` قفل شده‌اند (`ADR-0010` و `ADR-0036`):
- **چارچوب و API:** `Django==5.2.17`, `djangorestframework==3.18.1`, `drf-spectacular==0.30.0`, `django-filter==26.2`, `django-cors-headers==4.9.0`
- **تنظیمات و دیتابیس:** `django-environ==0.14.0`, `PyMySQL==1.2.3` (درایور خالص پایتون بدون نیاز به کامپایلر C و `libmysqlclient-dev` روی هاست اشتراکی)
- **پنل ادمین، تبادل داده و 2FA:** `django-jazzmin==3.0.5`, `django-import-export==4.4.1`, `django-otp==1.7.3`, `qrcode==8.2`
- **بومی‌سازی، محتوا و امنیت:** `django-modeltranslation==0.20.6`, `jdatetime==6.1.0`, `Markdown==3.9`, `nh3==0.3.7`, `Pillow==12.3.0`, `whitenoise==6.12.0`, `structlog==26.1.0`, `django-structlog==10.1.0`, `requests==2.32.5`
- **زیر-وابستگی‌های قفل‌شده:** `asgiref==3.12.1`, `sqlparse==0.6.0`, `tablib==3.10.0`, `PyYAML==6.0.3`, `jsonschema==4.26.0`, `urllib3==2.8.0` و سایر زیر-وابستگی‌ها.

---

## ۳. راهنمای گام‌به‌گام راه‌اندازی اولیه روی cPanel

### گام ۳.۱: ساخت دیتابیس و کاربر MySQL 8

1. وارد پنل **cPanel** شوید و از بخش **Databases** روی **MySQL® Databases** کلیک کنید.
2. در قسمت **Create New Database** نام دیتابیس را وارد کنید (مثلاً `cpaneluser_emmett`) و روی **Create Database** بزنید.
3. در قسمت **MySQL Users → Add New User** یک نام کاربری (مثلاً `cpaneluser_app`) و یک رمز عبور قوی بسازید.
4. در قسمت **Add User To Database** کاربر ساخته‌شده را به دیتابیس متصل کنید و در صفحهٔ بعد گزینهٔ **ALL PRIVILEGES** را تیک زده و روی **Make Changes** کلیک کنید.
5. از صفحهٔ اصلی cPanel وارد **phpMyAdmin** شوید، دیتابیس `cpaneluser_emmett` را انتخاب کنید و از تب **Operations → Collation** اطمینان حاصل کنید که انکودینگ روی `utf8mb4_unicode_ci` قرار دارد (یا کوئری زیر را در تب SQL اجرا کنید):
   ```sql
   ALTER DATABASE `cpaneluser_emmett` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### گام ۳.۲: دریافت کد پروژه در هاست

از صفحهٔ اصلی cPanel وارد **Terminal** (یا از طریق SSH وارد سرور) شوید و دستورات زیر را اجرا کنید:

```bash
cd ~
git clone https://github.com/EmmettSS/EmmettWebSite.git
cd ~/EmmettWebSite
```

### گام ۳.۳: راه‌اندازی بک‌اند در `Setup Python App` و `virtualenv`

1. ابتدا در ترمینال، فایل ورودی Passenger و فایل `.env` بک‌اند را از روی قالب‌های `.example` کپی کنید:
   ```bash
   cd ~/EmmettWebSite/backend
   cp deploy/passenger_wsgi.py.example passenger_wsgi.py
   cp .env.example .env
   chmod 600 .env
   ```
2. فایل `~/EmmettWebSite/backend/.env` را با ویرایشگر (`nano .env` یا File Manager سی‌پنل) باز کرده و مقادیر پروداکشن را طبق [بخش ۵](#۵-راهنمای-کامل-متغیرهای-محیطی-envexample) وارد کنید.
3. در cPanel از بخش **Software** وارد **Setup Python App** شوید و روی **Create Application** کلیک کنید:
   - **Python version:** `3.11`
   - **Application root:** `EmmettWebSite/backend`
   - **Application URL:** دامنهٔ اصلی و مسیر بک‌اند (در توپولوژی دامنهٔ واحد)
   - **Application startup file:** `passenger_wsgi.py`
   - **Application Entry point:** `application`
   - روی دکمهٔ **Create** در بالا سمت راست کلیک کنید.
4. پس از ساخته شدن اپلیکیشن، در بالای همان صفحه عبارت `source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate` را کپی کرده و در **Terminal** اجرا نمایید:
   ```bash
   source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
   cd ~/EmmettWebSite
   bash scripts/deploy_backend.sh --install-deps
   ```
5. برای ساخت اولین حساب مدیرکل (Superuser) و بارگذاری کاتالوگ‌های پایهٔ هوش مصنوعی، در همان محیط مجازی دستور زیر را اجرا کنید:
   ```bash
   cd ~/EmmettWebSite/backend
   python manage.py seed_ai_engine
   python manage.py createsuperuser
   ```
6. در صفحهٔ **Setup Python App** روی **Restart** کلیک کنید.

### گام ۳.۴: تنظیم مسیرهای `Static` و `Media` و فایل‌های `.htaccess`

در تنظیمات پروداکشن (`config/settings/production.py`)، متغیرهای زیر تنظیم شده‌اند:
- `STATIC_URL = "/static/"` و `STATIC_ROOT = BASE_DIR / "staticfiles"` (قابل تغییر با `DJANGO_STATIC_ROOT`)
- `MEDIA_URL = "/media/"` و `MEDIA_ROOT = BASE_DIR / "media"` (قابل تغییر با `DJANGO_MEDIA_ROOT`)

برای آنکه وب‌سرور Apache/LiteSpeed در هاست cPanel فایل‌های `/static/` و `/media/` را با حداکثر سرعت و با اعمال محدودیت‌های امنیتی سرو کند، دستورات زیر را در ترمینال اجرا کنید (`<cpanel_user>` را با نام کاربری هاست خود جایگزین کنید):

```bash
# ۱) اطمینان از وجود فایل امنیتی .htaccess در پوشهٔ media (جلوگیری از اجرای اسکریپت آپلودشده — ADR-0005)
cp ~/EmmettWebSite/backend/deploy/media.htaccess.example ~/EmmettWebSite/backend/media/.htaccess

# ۲) ایجاد سیم‌لینک پوشه‌های staticfiles و media در public_html
ln -sfn ~/EmmettWebSite/backend/staticfiles ~/public_html/static
ln -sfn ~/EmmettWebSite/backend/media ~/public_html/media

# ۳) کپی قواعد .htaccess دامنهٔ واحد در public_html (در صورت وجود فایل قبلی، ابتدا از آن بکاپ بگیرید)
cp ~/EmmettWebSite/backend/deploy/public_html.htaccess.example ~/public_html/.htaccess
```

> **نکته:** اسکریپت `scripts/deploy_backend.sh` در هر بار اجرا به‌صورت خودکار فایل `media/.htaccess` را بازنویسی و دستور `collectstatic --noinput --clear` را اجرا می‌کند.

### گام ۳.۵: راه‌اندازی فرانت‌اند در `Setup Node.js App`

1. در ترمینال، فایل ورودی Passenger برای Next.js را از روی قالب `.example` کپی کنید:
   ```bash
   cd ~/EmmettWebSite/frontend
   cp deploy/server.js.example server.js
   ```
2. در cPanel از بخش **Software** وارد **Setup Node.js App** شوید و روی **Create Application** کلیک کنید:
   - **Node.js version:** `22.x`
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** دامنهٔ اصلی سایت (مثلاً `emmett.ir`)
   - **Application startup file:** `server.js`
3. در پایین همان صفحه، در بخش **Environment variables** سه متغیر زیر را با کلیک روی **Add Variable** ثبت کنید:
   - `NODE_ENV` = `production`
   - `PUBLIC_SITE_URL` = `https://emmett.ir` (دامنهٔ واقعی خودتان بدون اسلش پایانی)
   - `INTERNAL_API_URL` = `http://127.0.0.1:8000` (آدرس داخلی سرویس بک‌اند جنگو)
4. روی **Create** (یا **Save**) کلیک کنید، سپس دستور `source /home/<cpanel_user>/nodevenv/...` بالای صفحه را کپی کرده و در **Terminal** اجرا کنید:
   ```bash
   source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
   cd ~/EmmettWebSite
   PUBLIC_SITE_URL=https://emmett.ir INTERNAL_API_URL=http://127.0.0.1:8000 bash scripts/deploy_frontend.sh --install-deps
   ```
5. در صفحهٔ **Setup Node.js App** روی **Restart** کلیک کنید.

### گام ۳.۶: ثبت Cron Jobها (بکاپ خودکار و نگهداری AI)

در cPanel وارد بخش **Advanced → Cron Jobs** شوید و سه Cron Job زیر را اضافه کنید (`<cpanel_user>` را با نام کاربری هاست خود جایگزین نمایید):

| زمان‌بندی (Minute / Hour / Day / Month / Weekday) | هدف | دستور کامل (Command) |
|---|---|---|
| `30 3 * * *` (هر شب ساعت ۰۳:۳۰) | بکاپ خودکار دیتابیس و Media با نگهداری ۷ نسخهٔ آخر | `cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py backup_db --keep 7 >> /home/<cpanel_user>/EmmettWebSite/backend/backups/cron.log 2>&1` |
| `0 4 * * 0` (یکشنبه‌ها ساعت ۰۴:۰۰) | هرس لاگ‌های عملیاتی `AIRequest` قدیمی‌تر از ۳۶۵ روز | `cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py purge_ai_audit >> /home/<cpanel_user>/EmmettWebSite/backend/backups/ai_purge.log 2>&1` |
| `30 4 * * *` (هر شب ساعت ۰۴:۳۰) | تولید پیش‌نویس خلاصهٔ مقالات جدید بلاگ (هنگام فعال بودن AI) | `cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py generate_blog_summaries >> /home/<cpanel_user>/EmmettWebSite/backend/backups/ai_summary.log 2>&1` |

---

## ۴. اسکریپت‌های خودکار استقرار، `collectstatic` و `migrate`

برای آنکه در به‌روزرسانی‌های بعدی نیازی به اجرای دستی تک‌تک دستورات نباشد، سه اسکریپت اجرایی در پوشهٔ `scripts/` قرار داده شده است:

### ۴.۱. اسکریپت استقرار بک‌اند (`scripts/deploy_backend.sh`)

این اسکریپت کارهای زیر را به‌ترتیب و با مدیریت خطا (`set -Eeuo pipefail`) انجام می‌دهد:
1. بررسی وجود `backend/.env` و تنظیم سطح دسترسی امن `chmod 600`؛
2. ساخت پوشه‌های `media`, `staticfiles`, `backups`, `.cache/django-cache`, `tmp` و اعمال `chmod 700` روی پوشه‌های حساس؛
3. کپی `media.htaccess.example` به `media/.htaccess` و `passenger_wsgi.py.example` به `passenger_wsgi.py`؛
4. نصب پکیج‌های Pin شدهٔ `requirements.txt` (در صورت ارسال سوئیچ `--install-deps`)؛
5. کامپایل و اعتبارسنجی فایل‌های ترجمهٔ دوزبانه (`python scripts/i18n.py compile && python scripts/i18n.py check`)؛
6. اجرای مهاجرت‌های دیتابیس (`python manage.py migrate --noinput`)؛
7. جمع‌آوری و فشرده‌سازی فایل‌های استاتیک (`python manage.py collectstatic --noinput --clear`)؛
8. اجرای ممیزی امنیتی پروداکشن (`python manage.py check --deploy`)؛
9. ری‌استارت بدون قطعی Passenger با `touch backend/tmp/restart.txt`.

**نحوهٔ اجرا پس از هر `git pull` در سرور:**
```bash
source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
cd ~/EmmettWebSite
bash scripts/deploy_backend.sh --install-deps
```

### ۴.۲. اسکریپت بیلد و استقرار فرانت‌اند (`scripts/deploy_frontend.sh`)

```bash
source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
cd ~/EmmettWebSite
PUBLIC_SITE_URL=https://emmett.ir bash scripts/deploy_frontend.sh --install-deps
```

---

## ۵. راهنمای کامل متغیرهای محیطی (`.env.example`)

الگوی کامل متغیرهای محیطی در `backend/.env.example` و `frontend/.env.example` قرار دارد. جدول زیر مقادیر الزامی در محیط پروداکشن (`config.settings.production`) را شرح می‌دهد:

| نام متغیر | مقدار نمونه در پروداکشن | الزامی؟ | توضیح و نقش امنیتی/معماری |
|---|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | بله | فعال‌سازی تنظیمات نهایی پروداکشن (`DEBUG=False` و MySQL) |
| `DJANGO_SECRET_KEY` | رشتهٔ تصادفی ≥ ۵۰ کاراکتر | بله | کلید رمزنگاری نشست‌ها و توکن‌ها؛ ضعیف بودن آن هشدار `W013` می‌دهد |
| `DJANGO_DEBUG` | `False` | بله | در `production.py` به‌طور قطعی روی `False` قفل شده است |
| `DJANGO_ALLOWED_HOSTS` | `emmett.ir,www.emmett.ir,127.0.0.1` | بله | فهرست دامنه‌های مجاز هدر `Host` |
| `PUBLIC_SITE_URL` | `https://emmett.ir` | بله | تنها منبع حقیقت برای ساخت canonical، hreflang، sitemap، OG و RSS (`W007`) |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://emmett.ir,https://www.emmett.ir` | بله | مبدأهای مورد اعتماد برای درخواست‌های تغییر وضعیت (`POST`/`PATCH`/`DELETE`) |
| `MYSQL_DATABASE` | `cpaneluser_emmett` | بله | نام دیتابیس MySQL 8 ساخته شده در cPanel |
| `MYSQL_USER` | `cpaneluser_app` | بله | نام کاربری دیتابیس MySQL |
| `MYSQL_PASSWORD` | `<رمز-قوی-دیتابیس>` | بله | رمز عبور دیتابیس MySQL |
| `MYSQL_HOST` / `MYSQL_PORT` | `127.0.0.1` / `3306` | بله | آدرس و پورت سرور MySQL محلی هاست |
| `MYSQL_CONN_MAX_AGE` | `60` | خیر | نگه‌داشت اتصال پایدار دیتابیس (ثانیه) همراه با `CONN_HEALTH_CHECKS=True` |
| `CACHE_BACKEND` | `filebased` | بله | استفاده از کش فایل‌محور بدون نیاز به Redis (`ADR-0006`) |
| `CACHE_LOCATION` | `/home/<user>/EmmettWebSite/backend/.cache/django-cache` | بله | مسیر دایرکتوری کش با دسترسی `700` |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` | بله | هدایت خودکار تمام درخواست‌های HTTP به HTTPS |
| `DJANGO_SESSION_COOKIE_SECURE` | `True` | بله | ارسال کوکی نشست فقط روی بستر HTTPS |
| `DJANGO_CSRF_COOKIE_SECURE` | `True` | بله | ارسال کوکی CSRF فقط روی بستر HTTPS |
| `DJANGO_SECURE_HSTS_SECONDS` | `31536000` | بله | فعال‌سازی HSTS به مدت ۱ سال به همراه `includeSubDomains` و `preload` |
| `DJANGO_CSP_ENABLED` | `True` | بله | فعال‌سازی هدر Content-Security-Policy دو‌سیاستی (`W008`) |
| `DJANGO_FRAME_ANCESTORS` | `'none'` | بله | جلوگیری از بارگذاری سایت درون `<iframe>` بیگانه (ضد Clickjacking) |
| `ADMIN_2FA_REQUIRED` | `True` | بله | اجبار احراز هویت دو مرحله‌ای TOTP برای تمام کارکنان ادمین (`W009`) |
| `LOGIN_LOCKOUT_ENABLED` | `True` | بله | قفل موقت ورود پس از ۵ تلاش ناموفق در ۱۵ دقیقه (`429 Too Many Requests`) |
| `BACKUP_DIR` | `/home/<user>/EmmettWebSite/backend/backups` | بله | مسیر نوشتنی خارج از `public_html` برای ذخیرهٔ بکاپ‌ها (`W011`/`W012`) |
| `BACKUP_RETENTION` | `7` | خیر | تعداد نسخه‌های بکاپ نگهداری‌شده پیش از حذف خودکار نسخه‌های قدیمی‌تر |
| `KAVENEGAR_API_KEY` | `<کلید-API-کاوه‌نگار>` | اختیاری | در صورت خالی بودن، بدون خطا به لاگ کنسول و ایمیل fallback می‌کند |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | اختیاری | بک‌اند ارسال ایمیل از طریق SMTP هاست (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) |
| `AI_ENABLED` | `false` یا `true` | اختیاری | کلید روشن/خاموش کردن درگاه هوش مصنوعی (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`) |

---

## ۶. راهنمای پشتیبان‌گیری (Backup) و بازیابی بحران (Restore)

### ۶.۱. تهیهٔ نسخهٔ پشتیبان (`manage.py backup_db`)

دستور مدیریت `backup_db` در هر اجرا سه فایل هم‌نام با برچسب زمانی UTC (`YYYYMMDDTHHMMSSZ`) در پوشهٔ `BACKUP_DIR` تولید می‌کند:
1. **`db-<stamp>.sql.gz`** (در MySQL با `mysqldump --single-transaction --quick --routines`؛ یا در صورت عدم دسترسی به باینری `mysqldump` روی هاست اشتراکی، به‌طور خودکار `db-<stamp>.json.gz` با `dumpdata`؛ و در SQLite فایل `db-<stamp>.sqlite3.gz` با `VACUUM INTO`).
2. **`media-<stamp>.tar.gz`** (آرشیو فشردهٔ کل پوشهٔ `MEDIA_ROOT`).
3. **`manifest-<stamp>.json`** (فایل متادیتا شامل زمان دقیق، موتور دیتابیس، استراتژی بکاپ، نام و حجم فایل‌ها).

**اجرای دستی بکاپ پیش از هر تغییر مهم:**
```bash
source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
cd ~/EmmettWebSite/backend
python manage.py backup_db --keep 7
```

### ۶.۲. بازیابی از نسخهٔ پشتیبان (`scripts/restore_backup.sh`)

برای مشاهدهٔ فهرست بکاپ‌های موجود و بازیابی ایمن دیتابیس یا فایل‌های Media از اسکریپت `scripts/restore_backup.sh` استفاده کنید (این اسکریپت پیش از بازنویسی، به‌طور خودکار یک بکاپ ایمنی جدید از وضعیت فعلی می‌گیرد):

```bash
cd ~/EmmettWebSite

# ۱) مشاهدهٔ فهرست بکاپ‌های موجود در پوشهٔ backups
bash scripts/restore_backup.sh --list

# ۲) بازیابی دیتابیس MySQL (یا SQLite / JSON)
bash scripts/restore_backup.sh --db backend/backups/db-20261006T033000Z.sql.gz

# ۳) بازیابی فایل‌های آپلودشده (Media) به همراه بازگردانی خودکار media/.htaccess
bash scripts/restore_backup.sh --media backend/backups/media-20261006T033000Z.tar.gz
```

---

## ۷. چک‌لیست نهایی Go-Live و عیب‌یابی

### ۷.۱. چک‌لیست پیش از باز کردن ترافیک عمومی (Pre-Launch)

- [ ] **گواهی SSL:** در cPanel بخش **SSL/TLS Status** گواهی AutoSSL برای `emmett.ir` و `www.emmett.ir` سبز و فعال است.
- [ ] **فایل `.env` پروداکشن:** در `backend/.env` مقدار `DJANGO_SETTINGS_MODULE=config.settings.production`، `DJANGO_DEBUG=False`، `PUBLIC_SITE_URL=https://emmett.ir` و یک `DJANGO_SECRET_KEY` تصادفی ۶۴ کاراکتری قرار گرفته و سطح دسترسی فایل `600` است.
- [ ] **بررسی امنیتی خودکار جنگو:** اجرای `python manage.py check --deploy` هیچ خطا یا هشداری (`emmett_admin.E001` تا `W013`) برنمی‌گرداند.
- [ ] **ترجمه‌های دوزبانه:** خروجی `python scripts/i18n.py check` سبز است.
- [ ] **احراز هویت دو مرحله‌ای ادمین (2FA):** حساب Superuser وارد `/admin/` شده، کد QR صفحهٔ `/admin/2fa/setup` را در اپ Authenticator اسکن کرده و ۸ کد بازیابی یک‌بارمصرف (`/admin/2fa/recovery`) را در مدیر رمز عبور امن ذخیره کرده است.
- [ ] **تنظیمات سئو در پنل ادمین (`Core → Site settings`):**
  - عنوان و توضیحات متای فارسی و انگلیسی پر شده است؛
  - کد تأیید Google Search Console (`search_console_verification`) ثبت شده است؛
  - اطلاعات تماس و لینک شبکه‌های اجتماعی سازمان وارد شده است.

### ۷.۲. چک‌لیست پس از انتشار (Post-Launch Verification)

- [ ] **سلامت بک‌اند و کش:** باز کردن `https://emmett.ir/api/v1/health/` پاسخ `200 OK` با `{"status": "ok", "database": "ok", "cache": "ok"}` برمی‌گرداند.
- [ ] **رندر دوزبانه و RTL/LTR:**
  - صفحهٔ `https://emmett.ir/` با زبان فارسی (`lang="fa" dir="rtl"`) و تاریخ شمسی/ارقام فارسی باز می‌شود.
  - صفحهٔ `https://emmett.ir/en` با زبان انگلیسی (`lang="en" dir="ltr"`) و تاریخ میلادی/ارقام لاتین باز می‌شود.
- [ ] **سئو، نقشهٔ سایت و فیدها:**
  - `https://emmett.ir/sitemap.xml` شامل تمام صفحات عمومی است و مسیرهای خصوصی (`/admin`, `/profile`, `/advisor`) در آن نیستند.
  - `https://emmett.ir/robots.txt` مسیرهای خصوصی را `Disallow` کرده و لینک `Sitemap: https://emmett.ir/sitemap.xml` را نشان می‌دهد.
  - فیدهای `https://emmett.ir/blog/rss` و `https://emmett.ir/academy/rss` و تصویر `https://emmett.ir/fa/opengraph-image` با کد `200` باز می‌شوند.
- [ ] **هدرهای امنیتی:** در تب Network مرورگر، هدرهای `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` و `Cross-Origin-Opener-Policy: same-origin` روی پاسخ‌ها حضور دارند.
- [ ] **امنیت پوشهٔ Media:** آپلود تصویر در ادمین کار می‌کند، اما درخواست به یک فایل غیررسانه‌ای یا اسکریپت در `/media/` توسط `media/.htaccess` مسدود می‌شود.
- [ ] **تست اولین بکاپ:** اجرای دستی `python manage.py backup_db` بدون خطا فایل‌های `db-*.gz`, `media-*.tar.gz` و `manifest-*.json` را در `backend/backups/` ایجاد می‌کند.

### ۷.۳. جدول عیب‌یابی سریع در هاست cPanel

| نشانهٔ خطا | علت احتمالی | راه‌حل دقیق |
|---|---|---|
| خطای `500` یا صفحهٔ سفید Passenger در بک‌اند | خطای متغیر محیطی در `.env` یا عدم اجرای `migrate` | بررسی لاگ `~/EmmettWebSite/backend/stderr.log` و اجرای `python manage.py check --deploy` در ترمینال |
| عدم بارگذاری استایل‌های پنل ادمین (`/admin/`) | اجرا نشدن `collectstatic` یا عدم وجود سیم‌لینک `public_html/static` | اجرای `bash scripts/deploy_backend.sh` و بررسی `ls -l ~/public_html/static` |
| خطای `403 CSRF verification failed` در فرم‌ها | عدم تطابق `DJANGO_CSRF_TRUSTED_ORIGINS` یا `PUBLIC_SITE_URL` با دامنهٔ HTTPS | قرار دادن `https://emmett.ir,https://www.emmett.ir` در `DJANGO_CSRF_TRUSTED_ORIGINS` و ری‌استارت Passenger |
| خطای `MySQL server has gone away` پس از مدتی بیکاری | بسته شدن اتصال توسط MySQL هاست اشتراکی | در `config/settings/production.py` گزینهٔ `CONN_HEALTH_CHECKS = True` فعال شده است؛ مطمئن شوید `DJANGO_SETTINGS_MODULE=config.settings.production` است |
| اعمال نشدن تغییرات کد پس از `git pull` | کش شدن پردازش پایتون/نود در Phusion Passenger | اجرای `touch ~/EmmettWebSite/backend/tmp/restart.txt` و `touch ~/EmmettWebSite/frontend/tmp/restart.txt` |
