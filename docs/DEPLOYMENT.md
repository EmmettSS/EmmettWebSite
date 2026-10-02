# Deployment — cPanel قدم‌به‌قدم

> این سند نسخهٔ رسمی `deploy/DEPLOY-CPANEL.fa.md` است که در درخت مستندات §۹ MASTER هم لازم است؛
> ورودی‌های محیطی (میزبان، نسخهٔ Python/MySQL) در `docs/OPEN-ITEMS.md` با مارکر B2 ثبت شده‌اند.

## شاهد اجرای محلی (dry-run)

ترتیب کامل استقرار به‌صورت واقعی روی یک نسخهٔ محلی اجرا شد (SQLite + مسیرهای temp)، چون میزبان cPanel (`B2`) هنوز در دسترس نیست. خروجی هر گام در `docs/LAUNCH-REPORT.md` ثبت شده است:

| گام | فرمان اجراشده | نتیجه |
|---|---|---|
| migrate | `manage.py migrate --noinput` | همهٔ مهاجرت‌ها اعمال شد، شامل `content.0003_sitconfig_lab_throughput` |
| collectstatic | `manage.py collectstatic --noinput` | ۱۵۴ فایل |
| backup | `db_backup` (با `BACKUP_DIR`) | `emmett-<stamp>.sqlite.gz` |
| restore | `db_restore <file> --confirm` | مقدار تغییر‌یافتهٔ پس از بکاپ به حالت قبل برگشت |
| static bridge | `render_public_html` (با `STATIC_BRIDGE_DIR` + `PUBLIC_SITE_URL`) | `fa/posts/<slug>/index.html` و معادل `en` ساخته شد |
| cron | `deploy/scripts/run-cron.sh scan-jobs|embed-jobs|render-public-html|purge-results|db-backup` | همه با کد خروج ۰؛ job اسکن واقعی → `grade C/75`, job embed → `done` |
| اسکن end-to-end | `POST /api/v1/scanner/jobs/` (consent=true) → cron | `result_id` تصادفی، TTL ۷ روز، بدون ذخیرهٔ IP |

> این runbook ساختاری است و هنوز روی میزبان تیم راستی‌آزمایی نشده است. B2 لازم است: Python 3.12، MySQL/MariaDB، SSH/Passenger، DNS و مشخصات cron.

## پیش‌نیاز
- cPanel دارای **Setup Python App / Passenger** با Python 3.12 و MariaDB/MySQL.
- دامنه/DNS و AutoSSL فعال؛ هاست اشتراکی باید امکان WSGI و cron داشته باشد.
- secrets از طریق محیط Python App، نه فایل tracked.

## مراحل
1. در cPanel یک Python App بسازید؛ application root را به مسیر امن `api/`، startup file به `passenger_wsgi.py` و entry point به `application` تنظیم کنید.
2. در virtualenv همان app این موارد را نصب کنید: `pip install -r requirements/prod.txt`.
3. در MySQL database/user بسازید و least privilege لازم برای database را بدهید. مقدارهای `DB_ENGINE=mysql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` را تنظیم کنید.
4. `DJANGO_SECRET_KEY` تصادفی و محرمانه، `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, `PUBLIC_SITE_URL` با دامنهٔ تأییدشده و `DJANGO_SETTINGS_MODULE=emmett.settings` را در env تنظیم کنید. برنامه در production بدون secret، host مجاز، HTTPS origin و SMTP با `DEFAULT_FROM_EMAIL` واقعی fail-closed می‌شود؛ `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, یکی از `EMAIL_USE_TLS`/`EMAIL_USE_SSL`, و `DEFAULT_FROM_EMAIL` را از B3 بگیرید.
5. `python manage.py migrate --noinput` و سپس `python manage.py collectstatic --noinput` اجرا کنید.
6. `deploy/crontab.txt` را با مسیر absolute به virtualenv و project اصلاح و در cPanel Cron Jobs وارد کنید.
7. وب static را از `web/dist` منتشر کنید؛ API proxy/rewrite را به Passenger WSGI وصل کنید. برای Static Bridge مقدار `STATIC_BRIDGE_DIR` را به document root قابل‌نوشتنِ release تنظیم کنید؛ مسیر پیش‌فرض صرفاً مناسب layout توسعه است. هیچ Node process روی سرور اجرا نشود.
8. AutoSSL/DNS را بررسی کنید و `/api/v1/health/`، `/api/docs/`، admin، contact test و HTTPS headers را smoke test کنید.
9. قبل از تولید، DB backup بگیرید و restore را روی staging آزمایش کنید؛ این دو هنوز انجام نشده‌اند.

## Rollback
نگهداری release پیشین `web/dist` و یک DB backup قبل از migration. اپ را به release قبلی برگردانید؛ migration معکوس فقط پس از بررسی backward compatibility مجاز است.

## رفع اشکال
Passenger error log و Django error log را بررسی کنید؛ secretها را از log حذف کنید. بعد از env change اپ را از cPanel restart کنید. نسخهٔ Python/MySQL ناسازگار با prompt یعنی توقف deploy و بازبینی dependencyها.
