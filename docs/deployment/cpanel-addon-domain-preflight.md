# پیش‌پرواز دامنهٔ Addon و Passenger در cPanel

> **وضعیت: راهنمای آمادهٔ راستی‌آزمایی؛ حساب هاست هنوز تأیید نشده است.** این سند تنظیماتِ قابل‌انتظار از خود مخزن را از واقعیت‌های مختص حساب cPanel جدا می‌کند. مسیر document root، نسخه‌های واقعاً نصب‌شده، قواعد Passenger، مجوزهای فایل و SSL تا زمان اجرای این بررسی‌ها روی همان حساب **نامعلوم** هستند. آن‌ها را با حدس یا مقدار نمونه پر نکنید.
>
> دامنهٔ هدف فعلی `emmett.ir` است. این مقدار به‌تنهایی اثبات نمی‌کند که Addon Domain، DNS، document root یا گواهی SSL روی هاست تنظیم شده‌اند.

این راهنما را **پیش از اجرای** دستورهای استقرار در `DEPLOYMENT.md` بخوانید. اگر هر شرط توقف برقرار شد، دیپلوی را متوقف کنید؛ از نسخهٔ `22.x`، مسیر `~/public_html`، نسخهٔ MySQL یا Application URL جایگزین‌شده با حدس استفاده نکنید.

## ۱. واقعیت‌های قابل‌تأیید از مخزن

| مورد                   | مقدار لازم/مرجع مخزن                                                                    | منبع                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| مخزن                   | `https://github.com/Samuell021/EmmettWebSiteUI.git`                                     | `origin` در checkout این پروژه                                         |
| نسخهٔ Node.js          | دقیقاً `22.22.3`؛ مقدار کلی `22.x` کافی نیست                                            | `frontend/package.json` و `NODE_VERSION` در `.github/workflows/ci.yml` |
| نسخهٔ Python           | `3.11`                                                                                  | CI و تنظیمات راه‌اندازی Django                                         |
| دیتابیس مورد انتظار    | MySQL 8 با `utf8mb4`                                                                    | `backend/config/settings/production.py` و راهنمای استقرار              |
| ورودی Django/Passenger | `backend/passenger_wsgi.py`، callable به نام `application`                              | `backend/deploy/passenger_wsgi.py.example`                             |
| ورودی Node/Passenger   | `frontend/server.js`، از `frontend/deploy/server.js.example` ساخته می‌شود               | راه‌انداز سفارشی Next.js                                               |
| دامنهٔ canonical فعلی  | `https://emmett.ir`، تا وقتی مالک دامنه مقدار دیگری تعیین نکرده باشد                    | نمونه‌های env و مستندات                                                |
| نسخهٔ code-to-deploy   | باید یک tag/commit تأییدشده باشد؛ مقدار پیش‌فرض شاخهٔ clone به‌تنهایی تأیید انتشار نیست | سیاست استقرار این پیش‌پرواز                                            |

**مهم:** ADR-0035 مسیر Python برابر `/backend` را به‌عنوان توپولوژی هدف پروژه پیشنهاد می‌کند؛ پشتیبانی حساب خاص از Node در ریشه و Python در آن mount هنوز باید در cPanel تأیید شود. اگر UI یا Passenger چنین ترکیبی را نمی‌پذیرد، این راهنما اجازهٔ تغییر به `/admin`، ساب‌دامنه یا پورت فرضی را نمی‌دهد؛ ابتدا توپولوژی جایگزین باید جداگانه تصویب شود.

## ۲. ثبت شواهد پیش از تغییر

در cPanel، برای Addon Domain هدف، از صفحهٔ **Domains** این موارد را ثبت کنید:

- نام دقیق دامنه و aliasهای آن؛
- **Document Root** کامل که خود cPanel نشان می‌دهد؛
- مسیر فایل `.htaccess` موجود در همان document root؛
- وضعیت DNS و محل مدیریت DNS؛
- آیا این دامنهٔ canonical است یا باید به host دیگری redirect شود.

در ادامه، `PROJECT_ROOT` مسیر checkout خصوصی پروژه است و `ADDON_DOCROOT` فقط مسیر مستندشده در cPanel. این دو مسیر الزاماً یکی نیستند و document root را به `public_html` تبدیل نکنید.

```bash
set -euo pipefail
PROJECT_ROOT="$HOME/EmmettWebSite"
APP_DOMAIN="emmett.ir"
# این مقدار را فقط با Document Root واقعیِ کپی‌شده از cPanel جایگزین کنید.
ADDON_DOCROOT="/home/<cpanel-user>/<exact-addon-document-root>"

case "$ADDON_DOCROOT" in
  *'<'*|*'>'*) echo 'Set ADDON_DOCROOT from cPanel before continuing' >&2; exit 1 ;;
esac
test -d "$PROJECT_ROOT" && test -d "$ADDON_DOCROOT"
PROJECT_REAL=$(readlink -f "$PROJECT_ROOT")
DOCROOT_REAL=$(readlink -f "$ADDON_DOCROOT")
printf 'project=%s\ndocument_root=%s\nresolved_document_root=%s\n' \
  "$PROJECT_REAL" "$ADDON_DOCROOT" "$DOCROOT_REAL"
if [[ "$DOCROOT_REAL" == "/" || "$PROJECT_REAL" == "$DOCROOT_REAL" || "$PROJECT_REAL" == "$DOCROOT_REAL/"* ]]; then
  echo 'Keep the private checkout outside the public document root' >&2
  exit 1
fi
```

مسیر `.htaccess` مربوط به Addon Domain برابر **`$ADDON_DOCROOT/.htaccess`** است، نه الزاماً `~/public_html/.htaccess`. اگر cPanel نشان می‌دهد فایل در مسیر دیگری مدیریت می‌شود، همان مسیر واقعی را ثبت کنید. پیش از هر ویرایش، نسخهٔ فعلی را در محلی خارج از document root پشتیبان بگیرید و hash آن را نگه دارید:

```bash
set -euo pipefail
HTACCESS="$ADDON_DOCROOT/.htaccess"
if [ -e "$HTACCESS" ]; then
  BACKUP=$(mktemp "$PROJECT_ROOT/.htaccess.cpanel-backup.XXXXXX")
  cp -p -- "$HTACCESS" "$BACKUP"
  sha256sum "$HTACCESS" "$BACKUP"
else
  echo "No .htaccess at the confirmed document root; inspect cPanel/parent rules before creating one."
fi
```

نام backup در دستور شامل timestamp است؛ پیش از اجرا بررسی کنید مقصد از قبل وجود نداشته باشد. فایل‌های backup را از document root بیرون نگه دارید.

## ۳. نسخه‌ها و تعریف دو Passenger App

### Node.js / Next.js

1. در **Setup Node.js App** بررسی کنید `22.22.3` دقیقاً به‌عنوان runtime قابل انتخاب باشد.
2. پس از فعال‌سازی همان محیطی که cPanel برای اپ ساخته، اجرا کنید:

   ```bash
   set -euo pipefail
   cd "$PROJECT_ROOT"
   node --version
   node -p 'require("./frontend/package.json").engines.node'
   ```

   خروجی Node باید `v22.22.3` و مقدار engine باید `22.22.3` باشد. اگر cPanel فقط نسخهٔ دیگری از 22، یا هر نسخهٔ ناسازگار دیگری می‌دهد، این شرط **تأیید نشده** است؛ تا انتخاب runtime سازگار، نصب dependency و build را متوقف کنید.

3. مقدارهای واقعی UI را ثبت کنید: Application root=`$PROJECT_ROOT/frontend`، Application URL روی host درست، startup file=`server.js`، mode=`Production` و `PORT` تخصیص‌داده‌شده به Passenger. URL دامنهٔ Addon را از روی root دامنهٔ اصلی کپی نکنید؛ host باید همان Addon Domain باشد.
4. `frontend/server.js` باید از `frontend/deploy/server.js.example` ساخته شده باشد. از `npm ci` و سپس `npm run build` در همان Node environment استفاده کنید؛ `scripts/deploy_frontend.sh` علاوه بر build فایل restart را لمس می‌کند، پس آن را فقط در زمان مجاز restart اجرا کنید.

### Python / Django و MySQL

1. در **Setup Python App** تأیید کنید Python `3.11.x` در دسترس است و برای پروژهٔ همین Addon Domain اپ جداگانه با Application root=`$PROJECT_ROOT/backend` تعریف می‌شود.
2. کپی startup command نمایش‌داده‌شده در cPanel را فعال و `python --version` را اجرا کنید؛ خروجی باید `Python 3.11.x` باشد. Application startup file باید `passenger_wsgi.py` و entry point برابر `application` باشد.
3. Application URL واقعی Python را از UI ثبت کنید. `/backend` صرفاً مقدار هدف ADR است، نه واقعیت تأییدشدهٔ این حساب. پیش از تنظیم `DJANGO_FORCE_SCRIPT_NAME`، route هم‌زمان Node و Python را با درخواست واقعی روی Addon Domain آزمایش کنید. برای redirect Django، `WSGIHandler` واقعی باید prefix را تولید کند.
4. با credentials موجود در `backend/.env`، نسخهٔ server دیتابیس را از **اتصال خود اپ** بخوانید؛ سرور باید MySQL 8 باشد. این query صرفاً خواندنی است:

   ```bash
   set -euo pipefail
   cd "$PROJECT_ROOT/backend"
   python manage.py shell -c 'from django.db import connection; c=connection.cursor(); c.execute("SELECT VERSION()"); print(c.fetchone()[0])'
   ```

   اگر خروجی MariaDB یا موتور دیگری است، آن را بدون آزمون سازگاری صریح معادل MySQL 8 ثبت نکنید. `manage.py check --deploy` نیز باید با environment واقعی صفر warning/error بدهد.

## ۴. قابلیت build، static، migration، symlink و media

این موارد را با همان کاربر و همان virtualenv که Passenger برای اپ استفاده می‌کند بررسی کنید:

- **Frontend build:** `npm ci` و `npm run build` را در staging یا پیش از انتشار اجرا کنید. build باید با runtime `22.22.3` و envهای صحیح تمام شود.
- **Static collection:** ابتدا خود فرمان را بدون تغییر filesystem با مسیر موقت اجرا کنید؛ سپس write permission دایرکتوری واقعی `STATIC_ROOT` (`backend/staticfiles` به‌طور پیش‌فرض) را با probe پایین بررسی کنید. اسکریپت `scripts/deploy_backend.sh` از `collectstatic --clear` استفاده می‌کند و فایل‌های خروجی قبلی را پاک‌سازی می‌کند؛ آن را برای آزمایش بی‌خطر فرض نکنید.

  ```bash
  set -euo pipefail
  cd "$PROJECT_ROOT/backend"
  tmp_static=$(mktemp -d)
  trap 'rm -rf -- "$tmp_static"' EXIT
  DJANGO_STATIC_ROOT="$tmp_static/static" python manage.py collectstatic --dry-run --noinput
  rm -rf -- "$tmp_static"
  trap - EXIT
  ```

- **Migration:** ابتدا فقط plan را ببینید:

  ```bash
  set -euo pipefail
  cd "$PROJECT_ROOT/backend"
  python manage.py migrate --plan
  ```

  `scripts/deploy_backend.sh` واقعاً `migrate --noinput`، `collectstatic --clear` و restart را اجرا می‌کند. خروجی plan مجوزهای نوشتن را ثابت نمی‌کند؛ امکان اجرای DDL را ابتدا روی دیتابیس staging جداگانه با همان سطح دسترسی بسنجید، نه با migration آزمایشی روی production. اجرای migration روی دیتابیس زنده فقط پس از backup، بررسی plan، مجوز maintenance و تأیید مالک مجاز است.

- **Symlink:** قبل از ساخت `static` و `media` در `$ADDON_DOCROOT`، وجود فایل/دایرکتوری/symlink هم‌نام را بررسی کنید. هیچ مقصد موجودی را کورکورانه با `ln -sfn` جایگزین نکنید. قابلیت ساخت symlink را ابتدا با یک probe موقت در document root بررسی و فوراً پاک کنید:

  ```bash
  set -euo pipefail
  probe=$(mktemp -d "$ADDON_DOCROOT/.cpanel-symlink-probe.XXXXXX") || exit 1
  trap 'rm -rf -- "$probe"' EXIT
  mkdir "$probe/target"
  ln -s "$probe/target" "$probe/link"
  test -L "$probe/link"
  readlink "$probe/link"
  rm -rf -- "$probe"
  trap - EXIT
  ```

  اگر هر فرمان شکست خورد، trap پوشهٔ آزمایش را پاک می‌کند؛ symlink واقعی نسازید و از پشتیبانی cPanel بپرسید آیا symlink مجاز است و مسیر سرو مستقیم را چگونه تنظیم می‌کنند.

- **Media:** کاربر Passenger باید بتواند در `backend/media` بنویسد و وب‌سرور باید مسیر media انتخاب‌شده را امن بخواند. مجوز را با فایل موقت و حذف فوری در خود دایرکتوری بسنجید؛ فایل واقعی کاربر را برای آزمایش نسازید/حذف نکنید. `media.htaccess.example` باید در مسیر media اجرا/دسترسی اسکریپت را محدود کند.

آزمون نوشتن کم‌خطر، پس از تعیین مسیرهای واقعی:

```bash
set -euo pipefail
for dir in "$PROJECT_ROOT/backend/staticfiles" "$PROJECT_ROOT/backend/media"; do
  test -d "$dir" && test -w "$dir" || { echo "not writable: $dir" >&2; exit 1; }
  probe=$(mktemp "$dir/.cpanel-preflight.XXXXXX")
  rm -- "$probe"
done
```

این آزمایش فقط write permission را ثابت می‌کند؛ دسترسی HTTP به symlink/media باید پس از تنظیم واقعی با URLهای HTTPS بررسی شود.

## ۵. Passenger و `.htaccess` مدیریت‌شدهٔ cPanel

1. پس از ساخت appها، فایل `.htaccess` موجود در document root واقعی را دوباره بررسی کنید و تمام بخش‌های Passenger را به‌عنوان تنظیم مدیریت‌شده حفظ کنید. نام و ترتیب directiveها ممکن است با نسخه و provider فرق کند؛ برای نمونهٔ مخزن فرضی از `PassengerBaseURI`, `PassengerAppRoot` یا بلوک‌های ثابت استفاده نکنید.
2. **هرگز** `backend/deploy/public_html.htaccess.example` را با `cp` روی فایل cPanel کپی نکنید و فایل موجود را کامل جایگزین نکنید. نمونه فقط قواعد امنیتی تکمیلی است؛ فقط directiveهای لازم را با تأیید پشتیبانی هاست merge کنید.
3. بعد از هر تغییر، با تنظیمات cPanel/Passenger تأیید کنید مسیرهای زیر به app درست می‌رسند. مسیر `/backend` در این جدول فقط وقتی معتبر است که cPanel آن را واقعاً ساخته باشد:

   | آزمون                                         | انتظار                                                                |
   | --------------------------------------------- | --------------------------------------------------------------------- |
   | `https://emmett.ir/`                          | Next.js روی دامنهٔ Addon                                              |
   | `https://emmett.ir/api/v1/health/`            | Next Route Handler → Django                                           |
   | `https://emmett.ir/backend/api/v1/health/`    | Django مستقیم، فقط اگر Application URL همان `/backend` تأیید شده باشد |
   | `https://emmett.ir/backend/admin/`            | redirect به login با همان mount prefix، فقط اگر mount تأیید شده باشد  |
   | `https://emmett.ir/static/admin/css/base.css` | فایل واقعی static، اگر symlink/مسیر webserver چنین طراحی شده باشد     |

اگر یک مسیر app اشتباه را نشان داد، stop کنید و اول routing را با پشتیبانی cPanel اصلاح کنید؛ `.htaccess` را با rewrite حدسی دستکاری نکنید.

## ۶. مخزن، شاخه و commit مورد استقرار

مخزن درست این پروژه `Samuell021/EmmettWebSiteUI` است؛ راهنمای قدیمی URL متفاوت `EmmettSS/EmmettWebSite` داشت و نباید از آن clone بگیرید. نمونهٔ مسیر پروژه:

```bash
set -euo pipefail
git clone https://github.com/Samuell021/EmmettWebSiteUI.git "$HOME/EmmettWebSite"
cd "$HOME/EmmettWebSite"
git remote get-url origin
git status --short --branch
git rev-parse HEAD
```

خروجی remote باید به `Samuell021/EmmettWebSiteUI` اشاره کند، نه مخزن هم‌نام/قدیمی. پیش از نصب، یک **tag یا SHA تأییدشده برای انتشار** انتخاب و ثبت کنید؛ شاخهٔ پیش‌فرض clone یا شاخهٔ موقت Arena را خودکار release فرض نکنید. پس از تعیین ref موردتأیید، آن را صریح checkout و دوباره بررسی کنید:

```bash
set -euo pipefail
APPROVED_REF='<approved-tag-or-full-commit-sha>' # پیش از اجرا با ref واقعی جایگزین کنید
git switch --detach "$APPROVED_REF"
git status --short --branch
git rev-parse HEAD
```

checkout تولید باید clean باشد و SHA آن با release تأییدشده تطبیق کند. اطلاعات branch/SHA را در گزارش تغییر ثبت کنید؛ credential را داخل URL یا shell history قرار ندهید.

## ۷. TLS، redirect و canonical host

- دامنهٔ هدف فعلی `emmett.ir` است؛ پیش از فعال‌کردن redirect بررسی کنید DNS آن به سرور درست resolve می‌شود و گواهی TLS معتبر برای `emmett.ir` نصب است. اگر `www.emmett.ir` یا hostname جداگانهٔ API استفاده می‌شود، گواهی و DNS همان host را هم مستقل تأیید کنید. برای API زیرمسیر `/backend` گواهی همان hostname کفایت می‌کند، اما route آن همچنان باید جداگانه کار کند.
- آزمون‌ها را از یک اتصال بیرونی اجرا کنید؛ `curl` را با `-k` اجرا نکنید، چون اعتبارسنجی گواهی را دور می‌زند. خروجی header را بخوانید: برای HTTP باید `Location` دقیقاً به HTTPS canonical برسد؛ HTTPS canonical باید با گواهی معتبر پاسخ دهد. دستورها عمداً redirect را دنبال نمی‌کنند تا زنجیره قابل‌بازبینی باشد:

  ```bash
  set -euo pipefail
  curl --fail --show-error --silent --dump-header - --output /dev/null http://emmett.ir/
  curl --fail --show-error --silent --dump-header - --output /dev/null https://emmett.ir/
  curl --fail --show-error https://emmett.ir/api/v1/health/
  # فقط اگر www در DNS/SSL تعریف شده است:
  curl --fail --show-error --silent --dump-header - --output /dev/null https://www.emmett.ir/
  ```

- اگر alias مانند `www` وجود دارد، redirect HTTP→HTTPS و alias→canonical را بدون loop و با `Location: https://emmett.ir/...` بررسی کنید. اگر API hostname جداگانه دارد، گواهی و redirect آن را هم جداگانه تست کنید؛ برای `/backend` روی همین hostname همان certificate کفایت می‌کند، اما health route باید پاسخ معتبر بدهد. مقدار `PUBLIC_SITE_URL`, `DJANGO_ALLOWED_HOSTS` و `DJANGO_CSRF_TRUSTED_ORIGINS` باید با hostهای واقعاً فعال هماهنگ باشند. canonical metadata به‌تنهایی redirect وب‌سرور را تضمین نمی‌کند.
- بعد از هر تغییر SSL/redirect، smoke test را برای صفحهٔ اصلی، health proxied، Django مستقیم (اگر mount فعال است) و login ادمین انجام دهید.

## برگهٔ ثبت راستی‌آزمایی حساب

تا وقتی نتیجهٔ واقعی هر ردیف ثبت نشده، آن را **تأییدنشده** بگذارید. وضعیت فعلی این راهنما در محیط Agent برای همهٔ موارد وابسته به cPanel «تأییدنشده» است؛ این محیط به پنل یا فایل‌های هاست دامنه دسترسی ندارد.

| مورد                                  | شاهدی که باید ثبت شود                                                       | وضعیت فعلی                                            |
| ------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| Addon Domain و document root          | خروجی/تصویر صفحهٔ Domains با مسیر واقعی (اطلاعات کاربری را بپوشانید)        | تأییدنشده                                             |
| Node Passenger                        | runtime دقیق `22.22.3`، Application URL و startup file در Setup Node.js App | تأییدنشده                                             |
| Python Passenger                      | Python `3.11.x`، Application URL، root و `passenger_wsgi.py:application`    | تأییدنشده                                             |
| MySQL                                 | خروجی `SELECT VERSION()` از اتصال همان Django app                           | تأییدنشده                                             |
| build/static/migrations/symlink/media | خروجی آزمون‌ها؛ برای migration فقط plan تا زمان مجوز اجرای واقعی            | تأییدنشده                                             |
| `.htaccess` Passenger                 | snapshot از فایل document root و smoke test بدون حذف directiveهای cPanel    | تأییدنشده                                             |
| repo/ref                              | origin درست، working tree clean، tag/SHA تأییدشده                           | بخشی از source تأیید شده؛ checkout روی هاست تأییدنشده |
| SSL/redirect/canonical                | پاسخ‌های `curl` با گواهی معتبر برای تمام hostهای فعال                       | تأییدنشده                                             |
