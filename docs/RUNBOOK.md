# Runbook — عملیات روزانهٔ امت (نسخهٔ ۱٫۰)

این سند برای کسی نوشته شده که **این پروژه را نساخته** و باید آن را زنده نگه دارد. هر گام با فرمان واقعی و مسیر واقعی آمده است. اگر جایی از این سند با سرور نمی‌خواند، **سند را اصلاح کنید، نه سرور را عادت بدهید**.

---

## ۰. چیزهایی که باید بدانید

| مورد | مقدار |
|---|---|
| ریشهٔ پروژه | `~/APP` (متغیر `APP_ROOT`) |
| وب‌سرور | Django 5.2 + Passenger روی cPanel (فایل `deploy/passenger_wsgi.py`) |
| فرانت‌اند | SPA ساخته‌شده در `web/dist` + Static Bridge (`fa/…/index.html` برای خزنده‌ها) |
| صف کار | جدول `jobs` + **cron** (بدون Redis، بدون Celery) |
| پایگاه داده | MySQL/MariaDB در production، SQLite در توسعه |
| فایل env | `~/private/EMMETT-cron.env` (chmod 600، بیرون از public_html) |
| بکاپ | `BACKUP_DIR` بیرون از public_html، ۷ روزانه + ۴ هفتگی |

**قانون طلایی:** هیچ کلید، رمز یا توکنی داخل Git نمی‌رود. همه از env می‌آید.

---

## ۱. کارهای روزانه (۵ دقیقه)

```sh
# ۱) سلامت سرویس و پایگاه داده
curl -s https://<domain>/api/v1/health/ | head -c 200

# ۲) آیا cron واقعاً کار می‌کند؟ (مهم‌ترین چیز در این سامانه)
ssh <account>@<host> 'grep -i cron ~/logs/*.log | tail -5'

# ۳) صف کار: هیچ کاری نباید «pending» کهنه بماند
ssh <account>@<host> 'cd ~/APP/api && ~/.virtualenvs/emmett/bin/python manage.py shell -c "
from apps.jobs.models import Job
from django.utils import timezone
from datetime import timedelta
old = Job.objects.filter(state=\"pending\", created_at__lt=timezone.now()-timedelta(minutes=15)).count()
print(\"pending older than 15m:\", old)"
'
```

اگر «pending کهنه» دیدید، مستقیم بروید به بخش ۵ (cron از کار افتاده) — **F-06 و F-08 به همین وابسته‌اند**.

---

## ۲. استقرار نسخهٔ جدید

ترتیب در `deploy/DEPLOY-CPANEL.fa.md` آمده است؛ خلاصهٔ عملی:

```sh
# ۰) بکاپ بگیرید (اگر بد شد، این نجات می‌دهد)
BACKUP_DIR=~/private/backups sh deploy/scripts/backup.sh

# ۱) کد را از گیت بگیرید (روی سرور، نه دستی)
cd ~/APP && git pull --ff-only

# ۲) وابستگی‌ها
~/.virtualenvs/emmett/bin/pip install -r api/requirements/prod.txt

# ۳) فرانت‌اند (روی میز کار، چون cPanel معمولاً Node ندارد)
#    در مخزن: corepack pnpm --filter @emmett/web build && corepack pnpm --filter @emmett/web seo:render
#    سپس dist/ را با rsync/SFTP به ~/APP/web/dist منتقل کنید.
#    ⚠️ seo:render باید با PUBLIC_SITE_URL دامنهٔ واقعی اجرا شود.

# ۴) migration و static
cd api && ~/.virtualenvs/emmett/bin/python manage.py migrate --noinput
~/.virtualenvs/emmett/bin/python manage.py collectstatic --noinput

# ۵) Static Bridge برای محتوای منتشرشده (بدون نیاز به JS)
STATIC_BRIDGE_DIR=~/APP/web/dist PUBLIC_SITE_URL=https://<domain> \
  ~/.virtualenvs/emmett/bin/python manage.py render_public_html

# ۶) ری‌استارت اپلیکیشن از پنل cPanel → Setup Python App
# ۷) اسموک تست
curl -s https://<domain>/api/v1/health/
curl -s https://<domain>/fa/ | head -5
```

**Rollback:** `git checkout <commit قبلی>` → گام‌های ۲، ۴، ۵، ۶. اگر مهاجرت داده مشکل داشت: بخش ۴ (restore).

---

## ۳. بکاپ

```sh
# دستی
BACKUP_DIR=~/private/backups sh deploy/scripts/backup.sh
# خروجی: ~/private/backups/emmett-YYYYMMDDThhmmssZ.sqlite.gz  یا  .sql.gz
```

- cron روزانه ساعت ۰۳:۳۰ (خط `db-backup` در `deploy/crontab.txt`).
- نگهداری خودکار: ۷ فایل آخر + ۴ هفتگی. قدیمی‌ترها **حذف می‌شوند**.
- بکاپ **بیرون** از `public_html` است؛ هرگز آن را داخل ریشهٔ وب نگذارید.

## ۴. Restore (واقعاً تست شده)

```sh
# ⚠️ درخواست CONFIRM اجباری است تا دستور تصادفی اجرا نشود
BACKUP_DIR=~/private/backups sh deploy/scripts/restore.sh ~/private/backups/emmett-<stamp>.sql.gz CONFIRM

# سپس:
# ۱) health را ببینید
curl -s https://<domain>/api/v1/health/
# ۲) یک اسکن واقعی بگیرید تا مسیر job+cron دوباره اثبات شود
# ۳) اگر اپ cache دارد، ری‌استارت پنل را فراموش نکنید
```

> در dry-run محلی همین مسیر اجرا شد: بکاپ گرفته شد، یک مقدار پس از بکاپ تغییر داده شد و restore آن را برگرداند (شاهد در `docs/LAUNCH-REPORT.md`).

---

## ۵. خرابی‌های رایج

### ۵.۱ cron از کار افتاده (شایع‌ترین خرابی)

**نشانه:** صف کار پر می‌شود، اسکن‌ها «queued» می‌مانند، دستیار جواب نمی‌دهد، بکاپ تازه نیست.

```sh
# ۱) آیا خطوط cron هستند؟
crontab -l | grep run-cron
# ۲) آیا فایل env هست و اجرا می‌شود؟
ls -l ~/private/EMMETT-cron.env         # باید 600 و قابل خواندن باشد
EMMETT_CRON_ENV_FILE=~/private/EMMETT-cron.env sh ~/APP/deploy/scripts/run-cron.sh scan-jobs
# ۳) اگر خروجی «Unknown cron task» داد، فایل env خط VIRTUAL_ENV/APP_ROOT را ندارد
# ۴) مخزن لاگ cron cPanel را ببینید (پنل → Cron Jobs → view log)
```

**تعمیر:** فایل env را بازسازی کنید (chmod 600)، سپس از پنل cron را ذخیره کنید و بلافاصله یک کار دستی اجرا کنید.

### ۵.۲ provider مدل زبانی قطع است

**نشانه:** پاسخ‌های دستیار با متن «سرویس موقتاً در دسترس نیست…» می‌آیند، ولی پاسخ‌های BM25 سالم‌اند.

- این **خرابی نیست**، رفتار طراحی‌شده است (fallback به BM25 با استناد).
- بررسی: `ASSISTANT_LLM_PROVIDER` و کلید در env؛ سپس لاگ درخواست‌های provider.
- اگر سقف روزانه پر شده باشد، `AssistantUsage.today().cost_usd` را ببینید؛ تا نیمه‌شب UTC پاسخ‌ها BM25 می‌مانند.
- **هرگز** برای «کم نگذاشتن» سقف را بی‌نهایت نکنید؛ سقف، محافظ قبض است.

### ۵.۳ بکاپ شکست خورده

- اگر `mysqldump` نبود: مسیر `mysqldump` را در PATH کاربر قرار دهید یا از `--single-transaction` نسخهٔ MariaDB همان سرور استفاده کنید.
- اگر دیسک پر است: فایل‌های قدیمی‌تر از دورهٔ نگهداری را دستی پاک کنید (روتین خودکار فقط ۷+۴ نگه می‌دارد).
- **پس از هر شکست بکاپ، یک بکاپ دستی بگیرید و همان‌جا restore را تست کنید.**

### ۵.۴ خطای «pending older than 15m» با تلاش‌های >۳

```sh
cd ~/APP/api && ~/.virtualenvs/emmett/bin/python manage.py shell -c "
from apps.jobs.models import Job
for j in Job.objects.filter(state='failed')[:5]:
    print(j.id, j.kind, (j.error or '')[:120])"
```

- خطای `KeyError: 'scan_id'` یعنی job بدون رکورد `ScanJob` ساخته شده (فقط در تست دستی رخ می‌دهد؛ مسیر UI این را نمی‌سازد).
- هر خطای دیگر: کد مسیر `kind` مربوطه را ببینید (`apps/scanner/jobs.py`، `apps/assistant/jobs.py`).

### ۵.۵ سایت بالا نیست ولی health سالم است

- `web/dist/index.html` سر جایش هست؟ (استقرار فرانت‌اند نیمه‌کاره مانده)
- Passenger را ری‌استارت کنید؛ سپس `~/logs/` را ببینید.
- اگر فقط صفحه‌های محتوا ۴۰۴ می‌دهند: `render_public_html` اجرا نشده است.

---

## ۶. مانیتورینگ

- **Uptime خارجی** روی دو نشانی: `/api/v1/health/` (باید `status: ok`) و `/` (باید 200 با عنوان درست بدهد). سرویس‌های رایگان uptime کافی است؛ مهم این است که **از بیرون** باشد.
- **شمارش خطا:** endpoint ادمین‌محور خطاها را می‌شمارد؛ هفتگی نگاه کنید و روند را در `docs/` ثبت کنید.
- **قاعده:** هر incident یک پاراگراف post-mortem می‌گیرد؛ «درست شد» بدون علت، incident بعدی را تضمین می‌کند.

---

## ۷. چک‌لیست پیش از هر انتشار

- [ ] `corepack pnpm --filter @emmett/web lint && typecheck && test` سبز
- [ ] `corepack pnpm --filter @emmett/web build && budget` سبز (initial ≤ ۲۰۰ KB، روت‌ها ≤ ۳۵۰ KB)
- [ ] `PUBLIC_SITE_URL=<domain> corepack pnpm --filter @emmett/web seo:render && seo:check` سبز
- [ ] `corepack pnpm --filter @emmett/web tool:contract` سبز (هر ابزار شاهد زنده دارد)
- [ ] `pytest -q` در `api/` سبز
- [ ] بکاپ تازه گرفته شده و **یک بار restore تست شده**
- [ ] `deploy/crontab.txt` با `crontab -l` سرور مطابقت دارد
- [ ] `docs/OPEN-ITEMS.md` به‌روز است (ورودی‌های تازه با مارکر ثبت شده‌اند)
