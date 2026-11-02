# راهنمای جامع استقرار روی هاست اشتراکی cPanel (`DEPLOYMENT.md`)

> **فاز ۹ — آمادگی استقرار (Deployment Readiness)**  
> **توپولوژی مصوب (`ADR-0035` و `ADR-0036`):** دامنهٔ واحد هم‌مبدأ (`Single-Domain Same-Origin`) روی هاست اشتراکی لینوکسی مجهز به **cPanel + Phusion Passenger (Python 3.11 & Node.js 22.22.3) + MySQL 8**.
> **پیش از تنظیم Addon Domain:** document root، نسخه‌های runtime، Application URL اپ Python و قواعد Passenger را طبق [پیش‌پرواز Addon Domain و Passenger](docs/deployment/cpanel-addon-domain-preflight.md) از حساب واقعی cPanel تأیید کنید. `/backend` فقط مسیر هدفِ ADR است، نه واقعیت تأییدشدهٔ این حساب؛ اگر cPanel آن را route نمی‌کند، استقرار را متوقف کنید. در هیچ مرحله‌ای `~/public_html` را به‌عنوان document root قطعی فرض نکنید.

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
   - [گام ۳.۵.۱: پیش‌پرواز خودکار (`preflight_cpanel.sh`)](#گام-۳۵۱-پیش‌پرواز-خودکار-تنها-راه-تأیید-استقرار-قطعی)
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
       صفحات عمومی + API هم‌مبدأ         │                         Django admin/API mount + فایل‌ها
       (/, /en/*, /api/v1/*)               ▼                         ▼ (/backend/*, /static/*, /media/*)
┌─────────────────────────────────────────┐       ┌─────────────────────────────────────────┐
│  Setup Node.js App (Next.js 16 SSR)     │       │  Setup Python App (Django 5.2 WSGI)     │
│  URL: / — ریشهٔ دامنه                   │       │  URL: /backend — mount اختصاصی          │
│  ریشه: ~/EmmettWebSite/frontend         │       │  ریشه: ~/EmmettWebSite/backend          │
│  proxy: /api/[...path] → /backend/api/* │ HTTP  │  فایل ورودی: passenger_wsgi.py          │
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
│   │   ├── .env                      # فقط اگر CLI/Cron نیاز دارد؛ خصوصی، chmod 600 و خارج از Git
│   │   ├── passenger_wsgi.py         # کپی‌شده از deploy/passenger_wsgi.py.example
│   │   ├── backups/                  # محل ذخیرهٔ بکاپ‌های روزانه (chmod 700 — خارج از document root واقعی)
│   │   ├── .cache/django-cache/      # کش فایل‌محور جنگو (chmod 700 — خارج از document root واقعی)
│   │   ├── staticfiles/              # خروجی collectstatic
│   │   └── media/                    # آپلودهای کاربران + فایل محافظ .htaccess
│   └── frontend/
│       └── server.js                 # کپی‌شده از deploy/server.js.example
└── <addon-domain-document-root>/     # مسیر واقعی را از cPanel → Domains بگیرید؛ public_html فرض نشود
    ├── .htaccess                     # فایل مدیریت‌شدهٔ cPanel/Passenger + قواعد تکمیلی ادغام‌شده
    ├── static -> ~/EmmettWebSite/backend/staticfiles   # فقط اگر symlink در هاست مجاز است
    └── media  -> ~/EmmettWebSite/backend/media         # فقط اگر symlink در هاست مجاز است
```

---

## ۲. وابستگی‌های Pin شده (`backend/requirements.txt`)

در فایل `backend/requirements.txt` تمام **۴۱ پکیج پروداکشن** (شامل ۲۱ پکیج مستقیم سطح اول و ۲۰ زیر-وابستگی زمان اجرا) با عملگر دقیق `==` قفل شده‌اند (`ADR-0010` و `ADR-0036`):
- **چارچوب و API:** `Django==5.2.17`, `djangorestframework==3.18.1`, `drf-spectacular==0.30.0`, `django-filter==26.2`, `django-cors-headers==4.9.0`
- **تنظیمات و دیتابیس:** `django-environ==0.14.0`, `PyMySQL==1.2.3` (درایور خالص پایتون بدون نیاز به کامپایلر C و `libmysqlclient-dev` روی هاست اشتراکی)
- **پنل ادمین، تبادل داده و 2FA:** `django-jazzmin==3.0.5`, `django-import-export==4.4.1`, `django-otp==1.7.3`, `qrcode==8.2`
- **بومی‌سازی، محتوا و امنیت:** `django-modeltranslation==0.20.6`, `polib==1.2.0` (کامپایل و ممیزی کاتالوگ‌های `.po`/`.mo` در اسکریپت استقرار)، `jdatetime==6.1.0`, `Markdown==3.9`, `nh3==0.3.7`, `Pillow==12.3.0`, `whitenoise==6.12.0`, `structlog==26.1.0`, `django-structlog==10.1.0`, `requests==2.32.5`
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

از صفحهٔ اصلی cPanel وارد **Terminal** (یا از طریق SSH وارد سرور) شوید، مخزن درست را clone کنید و پیش از نصب، URL و ref انتشار را مطابق [پیش‌پرواز](docs/deployment/cpanel-addon-domain-preflight.md) ثبت و تأیید کنید:

```bash
cd ~
git clone https://github.com/Samuell021/EmmettWebSiteUI.git ~/EmmettWebSite
cd ~/EmmettWebSite
git remote get-url origin
git status --short --branch
git rev-parse HEAD
```

### گام ۳.۳: راه‌اندازی بک‌اند در `Setup Python App` و `virtualenv`

1. ابتدا در ترمینال، فایل ورودی Passenger را از روی نمونه کپی کنید:
   ```bash
   cd ~/EmmettWebSite/backend
   cp deploy/passenger_wsgi.py.example passenger_wsgi.py
   ```
2. در **Setup Python App → Environment Variables** مقادیر runtime جنگو را ثبت کنید؛ از جمله `DJANGO_SETTINGS_MODULE=config.settings.production`, `DJANGO_FORCE_SCRIPT_NAME=/backend`, `PUBLIC_SITE_URL`, تنظیمات MySQL، `FRONTEND_REVALIDATE_URL=https://<canonical-host>/api/revalidate` و `FRONTEND_REVALIDATE_SECRET`. مقدار secret را بعداً عیناً در Node App نیز ثبت کنید. متغیرهای Passenger را در Terminal/Cron خودکار فرض نکنید. `scripts/deploy_backend.sh` به‌طور پیش‌فرض یک `backend/.env` خصوصی با مجوز `600` می‌خواهد؛ اگر تمام متغیرهای لازم را امن در محیط Terminal صادر کرده‌اید، فقط در آن صورت از `--allow-missing-env` استفاده کنید. برای `.env` سرور می‌توانید از `backend/.env.example` به‌عنوان فهرست متغیرها استفاده کنید، اما مقادیر توسعه را حتماً با Production جایگزین کنید و فایل را به Git اضافه نکنید. جزئیات مرز تنظیمات Passenger و CLI را ببینید در [راهنمای عملیات Production](docs/deployment/production-operations.md).
3. در cPanel از بخش **Software** وارد **Setup Python App** شوید و روی **Create Application** کلیک کنید:
   - **Python version:** `3.11`
   - **Application root:** `EmmettWebSite/backend`
   - **Application URL:** دقیقاً مسیر `/backend` روی دامنهٔ اصلی. Node.js در `/` می‌ماند؛ آدرس `/admin` را برای mount اپ Python انتخاب نکنید. `DJANGO_FORCE_SCRIPT_NAME=/backend` را در متغیرهای Environment همین Python App (و در صورت نیاز CLI/Cron در env خصوصی) بگذارید تا URLهای معکوس Django همان prefix را داشته باشند.
   - این چینش نیازمند اجازهٔ cPanel/Passenger برای route هم‌زمان Node در `/` و Python در `/backend` است. قواعد mount را cPanel می‌سازد؛ `.htaccess` تولیدی را نگه دارید و با نمونهٔ hardening این مخزن جایگزین نکنید.
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

برای سرو فایل‌های `/static/` و `/media/`، ابتدا مسیر واقعی **Document Root** را از cPanel → **Domains** دریافت و طبق [پیش‌پرواز](docs/deployment/cpanel-addon-domain-preflight.md) مسیرها/مجوزها را بررسی کنید. `~/public_html` فقط در صورتی معتبر است که cPanel دقیقاً همین Document Root را نشان دهد. پس از جایگزینی placeholder با مسیر واقعی و بررسی اینکه مقصدهای هم‌نام موجود نیستند، دستورات زیر را اجرا کنید:

```bash
PROJECT_ROOT="$HOME/EmmettWebSite"
# این مسیر را عیناً از cPanel → Domains بردارید؛ مقدار نمونه را اجرا نکنید.
ADDON_DOCROOT="/home/<cpanel_user>/<actual-addon-document-root>"
case "$ADDON_DOCROOT" in *'<'*|*'>'*) echo 'Set the real Addon Domain document root first' >&2; exit 1 ;; esac
test -d "$ADDON_DOCROOT" || { echo "Missing document root: $ADDON_DOCROOT" >&2; exit 1; }

# ۱) فایل امنیتی media؛ deploy_backend.sh نیز این فایل را ایجاد/به‌روزرسانی می‌کند.
cp "$PROJECT_ROOT/backend/deploy/media.htaccess.example" "$PROJECT_ROOT/backend/media/.htaccess"

# ۲) پیش از symlink، مقصدهای موجود را دستی بررسی کنید؛ هیچ‌کدام را کورکورانه overwrite نکنید.
for target in "$ADDON_DOCROOT/static" "$ADDON_DOCROOT/media"; do
  if [ -e "$target" ] || [ -L "$target" ]; then
    echo "Review existing path before changing it: $target" >&2
    exit 1
  fi
done
ln -s "$PROJECT_ROOT/backend/staticfiles" "$ADDON_DOCROOT/static"
ln -s "$PROJECT_ROOT/backend/media" "$ADDON_DOCROOT/media"
```

> **مهم دربارهٔ `.htaccess`:** فایل موردنظر `$ADDON_DOCROOT/.htaccess` است، نه الزاماً `~/public_html/.htaccess`. پس از ساخت appها، cPanel/Passenger قواعد خودش را می‌نویسد. از `backend/deploy/public_html.htaccess.example` فقط قواعد امنیتی تکمیلی را، پس از بررسی و تأیید provider، ادغام کنید؛ آن را روی `.htaccess` موجود کپی نکنید یا کامل جایگزین نسازید. قواعد Passenger را حفظ کنید و پس از تغییر، مسیر دامنهٔ اصلی، Application URL واقعی Python (اگر مجزا است) و `/static/` را smoke-test کنید.
>
> **نکته:** اسکریپت `scripts/deploy_backend.sh` در هر بار اجرا فایل `media/.htaccess` را بازنویسی و `collectstatic --noinput --clear` را اجرا می‌کند.

### گام ۳.۵: راه‌اندازی فرانت‌اند در `Setup Node.js App`

1. در ترمینال، فایل ورودی Passenger برای Next.js را از روی قالب `.example` کپی کنید:
   ```bash
   cd ~/EmmettWebSite/frontend
   cp deploy/server.js.example server.js
   ```
2. در cPanel از بخش **Software** وارد **Setup Node.js App** شوید و روی **Create Application** کلیک کنید:
   - **Node.js version:** دقیقاً `22.22.3`؛ مقدار کلی `22.x` را کافی فرض نکنید. نسخهٔ قفل‌شده در `frontend/package.json` و `.github/workflows/ci.yml` است؛ اگر همین runtime در cPanel قابل انتخاب نیست، نصب/build را متوقف کنید.
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** دامنهٔ اصلی سایت (مثلاً `emmett.ir`)
   - **Application startup file:** `server.js`
3. در بخش **Environment variables** این مقادیر را ثبت کنید:
   - `NODE_ENV=production`
   - `PUBLIC_SITE_URL=https://emmett.ir` (دامنهٔ canonical واقعی، بدون اسلش پایانی)
   - `INTERNAL_API_URL=https://emmett.ir/backend` (همان mount اپ Python؛ برای دامنهٔ دیگر host را جایگزین کنید)
   - `INTERNAL_API_TOKEN` = **توکن اجباری سرویس داخلی** (`ADR-0041`). مقدارش را یک‌بار بسازید و **دقیقاً یک‌سان** در سه جا ثبت کنید: `Environment variables` اپ Node، `Environment variables` اپ Python، و فایل `frontend/.env.local` (و برای CLI/Cron در `backend/.env`). اگر این توکن خالی یا ناهم‌خوان باشد، بیلد و اجرا هیچ خطایی نمی‌دهند اما صفحه‌های محتوایی پس از عبور از سقف throttle ناشناس (`100/hour`) **بی‌صدا خالی** می‌شوند.
     ```bash
     python3 -c "import secrets; print(secrets.token_urlsafe(50))"
     ```
   - `FRONTEND_REVALIDATE_SECRET` = همان secret پرقدرتی که در Environment Variables اپ Python ثبت شده؛ فقط server-side و بدون پیشوند `NEXT_PUBLIC_`. یک مقدار بسازید و عیناً در هر دو اپ ثبت کنید (در env خصوصی CLI هم فقط اگر لازم است):
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
4. فایل `frontend/.env.local` را با همان مقادیر بسازید (اسکریپت بیلد و CLI این فایل را می‌خوانند؛ `Environment variables` بالا فقط در زمان **اجرا** به اپ تزریق می‌شود و در شل ترمینال وجود ندارد). این فایل در `frontend/.gitignore` است:
   ```bash
   cd ~/EmmettWebSite/frontend
   cat > .env.local <<'EOF'
   PUBLIC_SITE_URL=https://emmett.ir
   INTERNAL_API_URL=https://emmett.ir/backend
   INTERNAL_API_TOKEN=<همان-توکنی-که-در-دو-اپ-ثبت-شد>
   FRONTEND_REVALIDATE_SECRET=<همان-secretی-که-در-دو-اپ-ثبت-شد>
   EOF
   chmod 600 .env.local
   ```
5. روی **Create/Save** کلیک کنید، سپس محیط Node را فعال و build کنید:
   ```bash
   source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
   cd ~/EmmettWebSite
   bash scripts/deploy_frontend.sh --install-deps
   ```
6. در صفحهٔ **Setup Node.js App** روی **Restart** کلیک کنید.
7. اسکریپت پیش‌پرواز را اجرا کنید (بخش بعد).

### گام ۳.۵.۱: پیش‌پرواز خودکار (تنها راه تأیید «استقرار قطعی»)

هیچ‌کدام از مراحل بالا به‌تنهایی ثابت نمی‌کند که سایتِ بالا آمده **داده دارد**. اسکریپت `scripts/preflight_cpanel.sh` همین را می‌سنجد: نسخهٔ runtime، وجود فایل‌های Passenger، مجوز نوشتن کش/آپلود/بکاپ، هم‌خوانی توکن دو اپ، و سپس پنج بررسی زنده روی دامنه — از جمله این‌که **عنوان واقعی اولین خدمت از API در HTML صفحهٔ اصلی هست یا نه** (معنی‌ترین نشانهٔ بیلدِ خالی).

```bash
cd ~/EmmettWebSite
bash scripts/preflight_cpanel.sh --url https://emmett.ir
```

- خروجی `0` یعنی همهٔ بررسی‌ها سبز است؛ خروجی `1` یعنی استقرار قطعی نیست و باید همان موارد `✗` را رفع کنید.
- اگر Django روی مسیری جز `/backend` mount شده است: `--backend-base /مسیر-واقعی`.
- برای اجرای محلی بدون دامنه: `--url http://127.0.0.1:3000 --backend-base ""`.
- برای بررسی‌های بصری و ادمین، اسکریپت فقط هشدار (`!`) می‌دهد و متوقف نمی‌شود.

> این اسکریپت **جایگزین** بررسی انسانی نیست؛ جای «هیچ بررسی‌ای نکردن» است. اگر همهٔ موارد سبز بود ولی باز هم شک دارید، بخش «راستی‌آزمایی توپولوژی» پایین را دستی اجرا کنید.

### راستی‌آزمایی توپولوژی قبل از Go-Live

این تست‌ها را از **ترمینال همان cPanel**، پس از Restart هر دو اپ اجرا کنید. مسیر مستقیم، mount Python را می‌سنجد؛ مسیر `/api/v1`، عبور مرورگر از Next به Python را:

```bash
curl --fail --show-error https://emmett.ir/backend/api/v1/health/
curl --fail --show-error https://emmett.ir/api/v1/health/
curl --silent --show-error --head https://emmett.ir/backend/admin/
```

هر دو health باید `200` و `status: ok` بدهند. پاسخ admin باید به login زیر `/backend/admin/login/` هدایت کند؛ از HTML نیز بررسی کنید URLهای static به `/static/` برسند. اگر درخواست HTTPS به دامنهٔ canonical از خود هاست به خودش مسدود است، **پورت localhost فرض نکنید**: از پشتیبانی هاست، آدرس داخلی قابل‌استفاده برای هر Passenger app را بگیرید و همان را در env تنظیم کنید. اگر هاست نتواند Node `/` و Python `/backend` را هم‌زمان route کند، استقرار را متوقف و توپولوژی جایگزین را جداگانه تصویب کنید.

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
2. **گیت اجباری توکن‌ها (`ADR-0041`)**: اگر `INTERNAL_API_TOKEN` یا `FRONTEND_REVALIDATE_SECRET` خالی باشد و تنظیمات روی `config.settings.production` باشد، اجرا با پیام فارسی و کد خروج `1` **متوقف** می‌شود (با `--allow-missing-env` یا `DJANGO_SETTINGS_MODULE=config.settings.dev` فقط هشدار می‌دهد). مقدارها از `env` شل یا از خود `backend/.env` خوانده می‌شوند؛
3. ساخت پوشه‌های `media`, `staticfiles`, `backups`, `.cache/django-cache`, `tmp` و اعمال `chmod 700` روی پوشه‌های حساس؛
4. کپی `media.htaccess.example` به `media/.htaccess` و `passenger_wsgi.py.example` به `passenger_wsgi.py`؛
5. نصب پکیج‌های Pin شدهٔ `requirements.txt` (در صورت ارسال سوئیچ `--install-deps`)؛
6. کامپایل و اعتبارسنجی فایل‌های ترجمهٔ دوزبانه (`python scripts/i18n.py compile && python scripts/i18n.py check`)؛
7. اجرای مهاجرت‌های دیتابیس (`python manage.py migrate --noinput`)؛
8. جمع‌آوری و فشرده‌سازی فایل‌های استاتیک (`python manage.py collectstatic --noinput --clear`)؛
9. اجرای ممیزی امنیتی پروداکشن (`python manage.py check --deploy`)؛
10. ری‌استارت بدون قطعی Passenger با `touch backend/tmp/restart.txt`.

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
bash scripts/deploy_frontend.sh --install-deps
```

این اسکریپت شش گام دارد و **هیچ‌کدام تزئینی نیست**؛ هر گام دقیقاً یک شکست خاموش را می‌بندد:

| گام | کار | شکستی که می‌بندد |
|---|---|---|
| ۱ | ساخت `frontend/server.js` از قالب Passenger و `tmp/` | اپ Node بالا نمی‌آید |
| ۲ | حل `PUBLIC_SITE_URL` / `INTERNAL_API_URL` / `INTERNAL_API_TOKEN` از env یا `.env.local` و `backend/.env`؛ **توقف** اگر توکن خالی باشد | بیلد ۶۱ صفحه با ۴۲۹ می‌سازد و سایت خالی بالا می‌آید |
| ۳ | انتظار تا `${INTERNAL_API_URL}/api/v1/health/` با کد `200` پاسخ دهد (تا `HEALTH_TIMEOUT_SECONDS`، پیش‌فرض ۹۰) | بیلد در حالی که Django خواب/خراب است |
| ۴ | `npm ci` (در صورت نیاز) و تست نوشتن در `frontend/.next` | کش ISR در زمان اجرا نوشته نمی‌شود و هر بازدید یک رندر کامل است |
| ۵ | `rm -rf .next && npm run build` و سپس `npm run verify:rendering` | رگرسیون ADR-0041: صفحه‌ای که در هر درخواست رندر می‌شود |
| ۶ | `touch frontend/tmp/restart.txt` + پیام قدم بعدی | فراموش‌شدن Restart اپ Node |

گام ۳ درخواست را با هدر `X-Internal-Token` هم می‌فرستد تا اگر نسخهٔ قدیمی بک‌اند هنوز در حال اجراست، این پروب در سطل throttle ناشناس نیفتد.

**وردی‌های قابل‌تنظیم:** `PUBLIC_SITE_URL`، `INTERNAL_API_URL`، `INTERNAL_API_TOKEN`، `HEALTH_TIMEOUT_SECONDS` (برای عیب‌یابی: `HEALTH_TIMEOUT_SECONDS=0` گام سلامت را رد می‌کند — **هرگز برای استقرار واقعی**)، و سوئیچ `--install-deps`.

---

## ۵. راهنمای کامل متغیرهای محیطی (`.env.example`)

الگوی کامل متغیرهای محیطی در `backend/.env.example` و `frontend/.env.example` قرار دارد. جدول زیر مقادیر الزامی در محیط پروداکشن (`config.settings.production`) را شرح می‌دهد. برای ثبت امن در پنل cPanel، تفکیک Passenger/Cron، آزمون اعلان‌ها، backup خارج از هاست و Restore، [راهنمای عملیات Production](docs/deployment/production-operations.md) را هم ببینید؛ برای گیت‌های Go/No-Go و ثبت شاهد روی staging از [چک‌لیست پذیرش](docs/deployment/staging-acceptance.md) استفاده کنید. هیچ‌کدام از این اسناد تأیید واقعی هاست نیستند.

| نام متغیر | مقدار نمونه در پروداکشن | الزامی؟ | توضیح و نقش امنیتی/معماری |
|---|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | بله | فعال‌سازی تنظیمات نهایی پروداکشن (`DEBUG=False` و MySQL) |
| `DJANGO_SECRET_KEY` | رشتهٔ تصادفی ≥ ۵۰ کاراکتر | بله | کلید رمزنگاری نشست‌ها و توکن‌ها؛ ضعیف بودن آن هشدار `W013` می‌دهد |
| `DJANGO_DEBUG` | `False` | بله | در `production.py` به‌طور قطعی روی `False` قفل شده است |
| `DJANGO_ALLOWED_HOSTS` | `emmett.ir,www.emmett.ir,127.0.0.1` | بله | فهرست دامنه‌های مجاز هدر `Host` |
| `PUBLIC_SITE_URL` | `https://emmett.ir` | بله | تنها منبع حقیقت برای ساخت canonical، hreflang، sitemap، OG و RSS (`W007`) |
| `DJANGO_FORCE_SCRIPT_NAME` | `/backend` | بله در cPanel | باید دقیقاً با Python App URL در Passenger یکی باشد؛ مسیر root توسعه را خالی بگذارید |
| `INTERNAL_API_URL` (frontend) | `https://emmett.ir/backend` | بله در cPanel | mount Python که توسط Server Components و Route Handler Next استفاده می‌شود؛ در محیط محلی `http://127.0.0.1:8000` |
| `INTERNAL_API_TOKEN` | `secrets.token_urlsafe(50)` | **بله** (از `ADR-0041`) | توکن مشترک Next ↔ Django. با هدر `X-Internal-Token` مقایسه می‌شود (`secrets.compare_digest`) و فراخوانی‌های سرور-به-سرور را از سقف throttle ناشناس (`100/hour`) معاف می‌کند. **باید در Python App، Node App، `backend/.env` و `frontend/.env.local` کاملاً یک‌سان باشد.** اگر خالی باشد، هم `deploy_backend.sh` و هم `deploy_frontend.sh` متوقف می‌شوند. اسکوپ‌های کاربری (`contact_form`, `ai_engine`, `auth`, `newsletter`) معاف **نمی‌شوند**. |
| `FRONTEND_REVALIDATE_URL` | `https://emmett.ir/api/revalidate` | بله برای on-demand invalidation | endpoint اپ Next؛ اگر آدرس داخلی مورد تأیید هاست دارید از همان استفاده کنید |
| `FRONTEND_REVALIDATE_SECRET` | secret تصادفی مشترک، حداقل ۳۲ بایت entropy | بله برای on-demand invalidation | مقدار یکسان در Python App و Node Environment Variables (و env خصوصی CLI در صورت نیاز)؛ هرگز `NEXT_PUBLIC_` نکنید |
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
| `DJANGO_NUM_PROXIES` | `1` | بله | تعداد پراکسی‌های مطمئن جلوتر از اپلیکیشن (`1` = Apache/Passenger با `RequestHeader set`؛ `2` = پشت CDN بدون `mod_remoteip`) |
| `BACKUP_DIR` | `/home/<user>/EmmettWebSite/backend/backups` | بله | مسیر نوشتنی خارج از document root واقعی Addon Domain برای ذخیرهٔ بکاپ‌ها (`W011`/`W012`) |
| `BACKUP_RETENTION` | `7` | خیر | تعداد نسخه‌های بکاپ نگهداری‌شده پیش از حذف خودکار نسخه‌های قدیمی‌تر |
| `KAVENEGAR_API_KEY` | `<کلید-API-کاوه‌نگار>` | اختیاری | در صورت خالی بودن، بدون خطا به لاگ کنسول و ایمیل fallback می‌کند |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | اختیاری | بک‌اند ارسال ایمیل از طریق SMTP هاست (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) |
| `AI_ENABLED` | `false` یا `true` | اختیاری | کلید روشن/خاموش کردن درگاه هوش مصنوعی (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`) |

---

## ۶. راهنمای پشتیبان‌گیری (Backup) و بازیابی بحران (Restore)

### ۶.۱. تهیهٔ نسخهٔ پشتیبان (`manage.py backup_db`)

دستور مدیریت `backup_db` در هر اجرا سه فایل هم‌نام با برچسب زمانی UTC (`YYYYMMDD-HHMMSS`) در پوشهٔ `BACKUP_DIR` تولید می‌کند:
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
bash scripts/restore_backup.sh --db backend/backups/db-20261022-033000.sql.gz

# ۳) بازیابی فایل‌های آپلودشده (Media) به همراه بازگردانی خودکار media/.htaccess
bash scripts/restore_backup.sh --media backend/backups/media-20261022-033000.tar.gz
```

---

## ۷. چک‌لیست نهایی Go-Live و عیب‌یابی

### ۷.۱. چک‌لیست پیش از باز کردن ترافیک عمومی (Pre-Launch)

- [ ] **گواهی SSL:** در cPanel بخش **SSL/TLS Status** گواهی AutoSSL برای `emmett.ir` و `www.emmett.ir` سبز و فعال است.
- [ ] **Environment Variables اپ‌ها:** متغیرهای runtime در Python App و Node App ثبت شده‌اند؛ `DJANGO_FORCE_SCRIPT_NAME=/backend` با mount واقعی برابر است و `FRONTEND_REVALIDATE_SECRET` در هر دو اپ یکسان است. اگر برای CLI/Cron فایل `backend/.env` لازم است، فقط روی سرور، خارج از Git و با مجوز `600` نگهداری می‌شود.
- [ ] **بررسی امنیتی خودکار جنگو:** اجرای `python manage.py check --deploy` هیچ خطا یا هشداری (`emmett_admin.E001` تا `W013`) برنمی‌گرداند.
- [ ] **پیش‌پرواز سبز:** `bash scripts/preflight_cpanel.sh --url https://emmett.ir` با کد خروج `0` تمام می‌شود (بخش ۳.۵.۱). این تنها گامی است که ثابت می‌کند HTML سایتِ بالا آمده محتوای واقعی دارد.
- [ ] **ترجمه‌های دوزبانه:** خروجی `python scripts/i18n.py check` سبز است.
- [ ] **احراز هویت دو مرحله‌ای ادمین (2FA):** حساب Superuser وارد `/backend/admin/` شده، کد QR صفحهٔ `/backend/admin/2fa/setup` را در اپ Authenticator اسکن کرده و ۸ کد بازیابی یک‌بارمصرف (`/backend/admin/2fa/recovery`) را در مدیر رمز عبور امن ذخیره کرده است.
- [ ] **تنظیمات سئو در پنل ادمین (`Core → Site settings`):**
  - عنوان و توضیحات متای فارسی و انگلیسی پر شده است؛
  - کد تأیید Google Search Console (`search_console_verification`) ثبت شده است؛
  - اطلاعات تماس و لینک شبکه‌های اجتماعی سازمان وارد شده است.
- [ ] **محتوای الزامی محصول `Pentestor` و درگاه هوش مصنوعی:**
  - در بخش `Portfolio → Projects` پنل ادمین، رکورد پروژه با `slug = "pentestor"`، `is_product = True` و وضعیت `Published` ثبت شده است (چون مسیر `/products/pentestor` به‌صورت دائمی `308` به `/projects/pentestor` هدایت می‌شود — `ADR-0040`).
  - در صورت استفاده از ویجت‌های «مشاور ایده‌پرداز» (`/advisor`) و «برآوردگر پروژه» (`/estimate`)، متغیرهای `AI_ENABLED=true`، `AI_API_BASE_URL`، `AI_API_KEY` و `AI_MODEL` در Python App environment (و در صورت نیاز CLI/Cron در env خصوصی) تنظیم شده‌اند.

### ۷.۲. چک‌لیست پس از انتشار (Post-Launch Verification)

- [ ] **پیش‌پرواز دوباره پس از Restart:** `bash scripts/preflight_cpanel.sh --url https://emmett.ir` صفر شکست بدهد؛ اگر «HTML صفحهٔ اصلی دادهٔ واقعی دارد» شکست خورد، بیلد با بک‌اند خاموش یا توکن نامعتبر انجام شده است — `bash scripts/deploy_frontend.sh` را دوباره اجرا کنید.
- [ ] **سلامت بک‌اند و کش:** باز کردن `https://emmett.ir/api/v1/health/` پاسخ `200 OK` با `{"status": "ok", "checks": {"database": true, "cache": true}}` برمی‌گرداند.
- [ ] **تشخیص زندهٔ پراکسی و Throttle روی هاست واقعی (گام الزامی پیش از ترافیک):** پس از ورود به `/backend/admin/`، باز کردن `https://emmett.ir/api/v1/health/proxy/` پاسخ `200 OK` با `"ready_for_traffic": true` و `"subsystems_in_sync": true` برمی‌گرداند و `resolved_client_ip` برابر IP واقعی مرورگر شماست (نه `127.0.0.1` و نه IP لبهٔ CDN).
- [ ] **رندر دوزبانه و RTL/LTR:**
  - صفحهٔ `https://emmett.ir/` با زبان فارسی (`lang="fa" dir="rtl"`) و تاریخ شمسی/ارقام فارسی باز می‌شود.
  - صفحهٔ `https://emmett.ir/en` با زبان انگلیسی (`lang="en" dir="ltr"`) و تاریخ میلادی/ارقام لاتین باز می‌شود.
- [ ] **سئو، نقشهٔ سایت و فیدها:**
  - `https://emmett.ir/sitemap.xml` شامل تمام صفحات عمومی است و مسیرهای خصوصی (`/backend/`, `/admin/`, `/profile/`, `/advisor/`) در آن نیستند.
  - `https://emmett.ir/robots.txt` مسیرهای خصوصی را `Disallow` کرده و لینک `Sitemap: https://emmett.ir/sitemap.xml` را نشان می‌دهد.
  - فیدهای `https://emmett.ir/blog/rss` و `https://emmett.ir/academy/rss` و تصاویر `https://emmett.ir/opengraph-image` و `https://emmett.ir/en/opengraph-image` با کد `200` باز می‌شوند.
- [ ] **هدرهای امنیتی:** در تب Network مرورگر، هدرهای `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` و `Cross-Origin-Opener-Policy: same-origin` روی پاسخ‌ها حضور دارند.
- [ ] **امنیت پوشهٔ Media:** آپلود تصویر در ادمین کار می‌کند، اما درخواست به یک فایل غیررسانه‌ای یا اسکریپت در `/media/` توسط `media/.htaccess` مسدود می‌شود.
- [ ] **تست اولین بکاپ:** اجرای دستی `python manage.py backup_db` بدون خطا فایل‌های `db-*.gz`, `media-*.tar.gz` و `manifest-*.json` را در `backend/backups/` ایجاد می‌کند.

### ۷.۳. جدول عیب‌یابی سریع در هاست cPanel

| نشانهٔ خطا | علت احتمالی | راه‌حل دقیق |
|---|---|---|
| خطای `500` یا صفحهٔ سفید Passenger در بک‌اند | خطای متغیر محیطی در `.env` یا عدم اجرای `migrate` | بررسی لاگ `~/EmmettWebSite/backend/stderr.log` و اجرای `python manage.py check --deploy` در ترمینال |
| عدم بارگذاری استایل‌های پنل Django admin | اجرا نشدن `collectstatic` یا عدم وجود symlink در document root واقعی Addon Domain | اجرای `bash scripts/deploy_backend.sh` و بررسی `ls -l "$ADDON_DOCROOT/static"` پس از تنظیم متغیر مطابق cPanel |
| خطای `403 CSRF verification failed` در فرم‌ها | عدم تطابق `DJANGO_CSRF_TRUSTED_ORIGINS` یا `PUBLIC_SITE_URL` با دامنهٔ HTTPS | قرار دادن `https://emmett.ir,https://www.emmett.ir` در `DJANGO_CSRF_TRUSTED_ORIGINS` و ری‌استارت Passenger |
| خطای `MySQL server has gone away` پس از مدتی بیکاری | بسته شدن اتصال توسط MySQL هاست اشتراکی | در `config/settings/production.py` گزینهٔ `CONN_HEALTH_CHECKS = True` فعال شده است؛ مطمئن شوید `DJANGO_SETTINGS_MODULE=config.settings.production` است |
| اعمال نشدن تغییرات کد پس از `git pull` | کش شدن پردازش پایتون/نود در Phusion Passenger | اجرای `touch ~/EmmettWebSite/backend/tmp/restart.txt` و `touch ~/EmmettWebSite/frontend/tmp/restart.txt` |
| صفحه‌ها بالا می‌آیند ولی **خالی‌اند** (اسکلت هست، محتوا نه) | بیلد فرانت در حالی انجام شده که Django خاموش بود یا `INTERNAL_API_TOKEN` در دو اپ یک‌سان نبود؛ بیلد چنین وضعیتی را «موفق» اعلام می‌کند | `bash scripts/preflight_cpanel.sh --url https://emmett.ir` را ببینید؛ سپس توکن را در هر چهار جا یک‌سان کنید و `bash scripts/deploy_frontend.sh` را دوباره اجرا کنید |
| `429` روی `/api/v1/health/` بعد از چند ساعت (مانیتور می‌گوید سایت دان است) | نسخهٔ قدیمی بک‌اند که `health` را از throttle معاف نمی‌کرد | `git pull` + `bash scripts/deploy_backend.sh`؛ در نسخهٔ فعلی `HealthCheckView.throttle_classes = []` است و این endpoint هرگز ۴۲۹ نمی‌دهد (تست: `apps/core/tests/test_health_check.py::test_health_check_never_trips_the_anonymous_throttle`) |
| خطای `429 Too Many Requests` سراسری برای همهٔ کاربران یا `ready_for_traffic: false` در `/api/v1/health/proxy/` | ادغام نشدن `RequestHeader set X-Forwarded-For` در `.htaccess` مربوط به document root واقعی Addon Domain یا قرارگیری پشت CDN بدون تنظیم `DJANGO_NUM_PROXIES` | محل `.htaccess` و قواعد Passenger را از cPanel تأیید کنید؛ سپس قواعد تکمیلی `<IfModule mod_headers.c>` را بدون جایگزینی فایل کامل merge کنید (یا در حالت CDN بدون `mod_remoteip`، پس از تأیید chain، `set` را به `append` و `DJANGO_NUM_PROXIES=2` کنید) و endpoint تشخیصی را دوباره بررسی کنید |
