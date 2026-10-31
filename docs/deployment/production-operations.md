# راهنمای عملیات Production: محیط، اعلان‌ها، رسانه و بازیابی

این سند مکمل راهنمای [استقرار cPanel](../../DEPLOYMENT.md) و پیش‌پرواز [Addon Domain و Passenger](cpanel-addon-domain-preflight.md) است. برای مقادیر واقعی هاست، فقط حساب cPanel و تأیید ارائه‌دهندهٔ هاست مرجع است؛ هیچ دامنه، نام دیتابیس، مسیر، مقدار SMTP/SMS، محدودیت منابع یا قابلیت Passenger در این سند به‌عنوان مقدار تأییدشده فرض نشده است.

> **وضعیت این اجرا:** دسترسی cPanel/Production در اختیار عامل نیست. بنابراین Environment Variables واقعی ثبت یا راستی‌آزمایی نشده‌اند و هیچ ارسال واقعی ایمیل/SMS، انتقال offsite، restore روی هاست یا health check زنده‌ای گزارش نمی‌شود. چک‌لیست‌های «نیازمند اجرای مالک هاست» عمداً باز می‌مانند.

## ۱. مرز نگهداری تنظیمات

- متغیرهای سرویس Python را در تنظیمات محیطی **همان Python App** در cPanel و متغیرهای Next را در تنظیمات محیطی **همان Node.js App** وارد کنید. نام منو/امکان ارائه‌شده ممکن است با provider فرق کند؛ اگر برای اپ متغیر محیطی امن در دسترس نیست، قبل از انتشار با provider تأیید کنید و secret را در Git، issue، chat یا فایل عمومی جایگزین نکنید.
- `backend/.env.example` و `frontend/.env.example` نمونه‌اند، نه فایل آمادهٔ Production. آن‌ها را با مقادیر واقعی پر نکنید یا commit نکنید. هیچ‌یک از secretهای این runbook واقعی نیستند.
- روی سرور، متغیرهای Passenger و محیط `Terminal`/`Cron` را جداگانه راستی‌آزمایی کنید؛ متغیرهای ثبت‌شده برای اپ را **خودکار** در Cron حاضر فرض نکنید. `manage.py` در نبود env process، `backend/.env` را می‌خواند و به‌طور پیش‌فرض تنظیمات dev را انتخاب می‌کند. برای Cron/CLI باید `DJANGO_SETTINGS_MODULE=config.settings.production` و دسترسی امن به تنظیمات Production برقرار باشد. اگر لازم شد env خصوصی برای CLI نگه دارید، آن را فقط روی سرور، خارج از document root و خارج از Git، با مجوز محدود (مثلاً `600`) و مطابق روش امن مورد تأیید provider نگه دارید؛ Cron را با `check --deploy` و بدون چاپ مقدار secret آزمایش کنید. اسکریپت restore فعلی برای واردکردن dump نوع MySQL نیز `backend/.env` را می‌خواند، مگر اینکه متغیرهای لازم در همان process export شده باشند.
- مقدارهای لازم برای این حساب را از اطلاعات همان حساب بگیرید؛ جدول پایین «نام و منبع تصمیم» است، نه مقادیر تأییدشدهٔ هاست.

## ۲. متغیرهای Python / Django

این مقادیر را در محیط Python App تنظیم کنید. دامنه و مسیرهای نمونه را با مقادیر تأییدشدهٔ cPanel عوض کنید.

| متغیر | مقدار/قاعدهٔ Production | نکتهٔ راستی‌آزمایی |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | برای Passenger و هر فرمان Production در CLI/Cron. |
| `DJANGO_SECRET_KEY` | کلید مستقل و تصادفی، دست‌کم ۵۰ نویسه | روی دستگاه/روش امن تولید و مستقیم در پنل وارد شود؛ با dev یا Node مشترک نباشد. نمونهٔ تولید محلی: `python -c 'import secrets; print(secrets.token_urlsafe(64))'`. مقدار را در log، chat یا Git نگذارید. |
| `DJANGO_DEBUG` | Production آن را در `production.py` بدون قید روی `False` تنظیم می‌کند | مقدار env نمی‌تواند این اجبار کد را روشن کند؛ در `check --deploy` و پاسخ خطای کنترل‌شده بررسی شود. |
| `DJANGO_ALLOWED_HOSTS` | فقط hostnameهای واقعی این سایت، جداشده با کاما | `production.py`، `127.0.0.1` و `localhost` را اضافه می‌کند؛ این مورد جای دامنهٔ عمومی را نمی‌گیرد. مقدار دامنه را از cPanel تأیید کنید. |
| `PUBLIC_SITE_URL` | URL canonical واقعی با `https://` و بدون اسلش پایانی | برای CSRF پیش‌فرض، canonical/SEO و ساخت URLها استفاده می‌شود. دامنهٔ `www` را فقط اگر واقعاً فعال است اضافه کنید. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | originهای HTTPS واقعی، جداشده با کاما؛ برای نمونه `https://<host>` | scheme باید `https://` باشد؛ فقط originهای موردنیاز را فهرست کنید، نه مسیر API. پس از ثبت، فرم/درخواست تغییر وضعیت از origin رسمی را smoke-test کنید. |
| `DJANGO_FORCE_SCRIPT_NAME` | دقیقاً prefix تأییدشدهٔ Python App در Passenger | `/backend` در ADR هدف است، اما تا تأیید Application URL و routing واقعی مقدار قطعی نیست؛ برای mount ریشه خالی است. با [پیش‌پرواز](cpanel-addon-domain-preflight.md) تطبیق دهید. |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | اطلاعات دیتابیس و کاربر اختصاصی ساخته‌شده در cPanel | رمز فقط در پنل امن. از نام/رمز نمونه استفاده نکنید؛ دسترسی کاربر را به دیتابیس اپ محدود کنید. |
| `MYSQL_HOST`, `MYSQL_PORT` | host/port اعلام‌شده برای MySQL همین حساب | `127.0.0.1:3306` فقط default کد است، نه تأیید وضعیت هاست. |
| `MYSQL_CONN_MAX_AGE` | در صورت نیاز، بر اساس محدودیت connection ارائه‌دهنده | مقدار پیش‌فرض کد ۶۰ ثانیه است؛ محدودیت هم‌زمانی دیتابیس هاست را بررسی کنید. |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` (پیش‌فرض Production) | فقط پس از فعال‌شدن TLS معتبر و درست بودن تشخیص proxy؛ در Production به‌عنوان راه‌حل رفع loop خاموش نکنید، ابتدا `X-Forwarded-Proto`/تنظیم Passenger را بررسی کنید. |
| `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_CSRF_COOKIE_SECURE` | هر دو `True` (پیش‌فرض Production) | کوکی‌ها باید فقط روی HTTPS فرستاده شوند. `SESSION_COOKIE_HTTPONLY=True` و CSRF cookie برای جریان same-origin فرانت‌اند قابل‌خواندن است. |
| `DJANGO_SECURE_HSTS_SECONDS` | پیش‌فرض `31536000` ثانیه (یک سال) | `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True` و `DJANGO_SECURE_HSTS_PRELOAD=True` نیز default هستند. پیش از فعال ماندن، پوشش HTTPS همهٔ زیردامنه‌ها را تأیید کنید؛ preload header به‌تنهایی به معنی ثبت در فهرست preload نیست. |
| `DJANGO_NUM_PROXIES` | تعداد hopهای proxy مورد اعتماد که provider تأیید می‌کند | default `1` را بدون بررسی CDN/Apache تغییر ندهید. `SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO','https')` است؛ تشخیص زندهٔ `/api/v1/health/proxy/` فقط برای مدیر احراز هویت‌شده است. |
| `FRONTEND_REVALIDATE_URL` | endpoint سروری Next که از بک‌اند قابل دسترسی است | در توپولوژی هدف مسیر `/api/revalidate` است؛ host/path و دسترسی داخلی را در حساب واقعی تأیید کنید. |
| `FRONTEND_REVALIDATE_SECRET` | secret تصادفی مستقل، مشترک فقط با Node | عین همان مقدار را در متغیر server-side Node ثبت کنید؛ `NEXT_PUBLIC_` نکنید. اگر on-demand revalidation استفاده نمی‌شود، تنظیم/غیرفعال‌بودنش را جداگانه تأیید کنید. |
| `DJANGO_MEDIA_ROOT` | مسیر پایدار، قابل‌نوشتن برای اپ و بیرون از document root | فقط اگر مسیر پیش‌فرض مناسب نیست تنظیم کنید. دسترسی عمومی media را با symlink و `.htaccess` تأییدشده مدیریت کنید؛ private uploads را عمومی نکنید. |
| `MEDIA_MAX_IMAGE_SIZE_MB`, `MEDIA_MAX_DOCUMENT_SIZE_MB` | اعتبارسنجی فایل‌های مدل Media به‌ترتیب پیش‌فرض ۵ و ۱۰ MB دارد | این‌ها محدودیت اعتبارسنجی برنامه‌اند؛ سقف بدنهٔ درخواست در Apache/LiteSpeed/Passenger ممکن است جدا باشد. هر دو لایه و فایل واقعی نزدیک به حد مجاز را تست کنید. |
| `BACKUP_DIR` | مسیر writable خارج از document root و ترجیحاً جدا از فایل‌های سرویس عمومی | پوشه باید فقط برای account/app قابل‌دسترسی باشد. مسیر نمونه را از layout واقعی هاست تعیین کنید. |
| `BACKUP_RETENTION`, `BACKUP_INCLUDE_MEDIA` | default برنامه به‌ترتیب `7` نسخه و `True` | هفت نسخهٔ محلی به معنی offsite یا retention کافی نیست؛ فضای هاست و سیاست مصوب مالک را در نظر بگیرید. |
| `AI_ENABLED`, `AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | فقط اگر قابلیت AI در Production استفاده می‌شود | پیش‌فرض `AI_ENABLED=False` است. provider/مدل/مصرف مجاز را پیش از ثبت secret مشخص کنید؛ در غیر این صورت خاموش بماند. |

### HTTPS و proxy: معیار پذیرش

1. گواهی TLS برای hostهای واقعاً استفاده‌شده معتبر و تمدید خودکار آن فعال باشد.
2. بررسی پاسخ HTTPS نشان دهد redirect-loop وجود ندارد و Django درخواست HTTPS پشت Passenger را درست تشخیص می‌دهد؛ مقدار هدر/تعداد proxy را از provider یا preflight بگیرید، حدس نزنید.
3. پاسخ Production دارای HSTS و cookieهای Secure باشد؛ `check --deploy` را اجرا کنید. اگر `includeSubDomains`/`preload` با دامنه‌های واقعی سازگار نیست، تغییر باید آگاهانه و پیش از rollout انجام شود.
4. مسیر مستقیم Python و مسیر پراکسی‌شدهٔ Next هر دو موفق باشند. آدرس API داخلی را تا زمان تأیید از حساب واقعی تعیین نکنید.

## ۳. متغیرهای Node.js / Next.js

در **همان Node.js App**، server-side تنظیم کنید:

| متغیر | قاعده |
|---|---|
| `NODE_ENV` | `production` |
| `PUBLIC_SITE_URL` | URL canonical HTTPS نهایی، بدون slash پایانی؛ باید با Django یکسان باشد. |
| `INTERNAL_API_URL` | base URL واقعی Django و prefix تأییدشده؛ `/backend` فقط زمانی که routing cPanel آن را ثابت کرده باشد. |
| `FRONTEND_REVALIDATE_SECRET` | همان secret مشترک با Django، بدون `NEXT_PUBLIC_`. |
| `MEDIA_ROOT` | فقط اگر Next برای بهینه‌سازی تصویر به مسیر فیزیکی media نیاز دارد؛ مسیر private و واقعی همان سرور را تأیید کنید. |

پس از تغییر Environment Variables، اپ Next را از cPanel restart و build/runtime را با دو مسیر public API آزمایش کنید. هیچ secret سمت سرور نباید با پیشوند `NEXT_PUBLIC_` منتشر شود.

## ۴. ایمیل، SMS و ثبت فرم — سه نتیجهٔ جدا

ثبت موفق Contact/Lead و delivery اعلان دو عملیات مجزا هستند. View ابتدا داده را ذخیره می‌کند؛ شکست ارسال اعلان نباید ذخیره را rollback کند یا پاسخ موفق فرم را به خطای ثبت تبدیل کند. پس از تغییر این مرحله، خطای SMTP هم به‌جای بلعیده‌شدن باید در log ساختاریافتهٔ Django به‌صورت `contact_email_notification_failed` ثبت شود. SMS نیز با `kavenegar_sms_failed` قابل پایش است؛ کلید Kavenegar داخل URL درخواست قرار می‌گیرد و متن خطا/secret آن نباید در log باشد.

### SMTP — فقط در صورت نیاز به ایمیل واقعی

- برای ارسال واقعی، `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` را صریح تنظیم کنید و `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` را از ارائه‌دهندهٔ ایمیل بگیرید.
- `EMAIL_USE_TLS` و `EMAIL_USE_SSL` را مطابق مستندات همان provider انتخاب کنید؛ هر دو را هم‌زمان روشن نکنید. مقدار پیش‌فرض کد TLS روشن و SSL خاموش است.
- `LEADS_NOTIFICATION_EMAIL` مقصد اعلان سرنخ است. خالی بودنش یعنی اعلان ایمیل غیرفعال. اگر backend روی Console باشد، ایمیل واقعی فرستاده نمی‌شود و محتوای پیام ممکن است در log بیاید؛ مقصد واقعی را با backend کنسولی رها نکنید.
- پس از تنظیم، با فرم آزمایشی کنترل‌شده یک‌بار ثبت دیتابیس را بررسی و جداگانه دریافت پیام در mailbox و log SMTP را تأیید کنید. نتیجهٔ `201` یا وجود رکورد به‌تنهایی اثبات تحویل ایمیل نیست.

### SMS — فقط در صورت نیاز به پیامک واقعی

- `LEADS_NOTIFICATION_PHONE` مقصد واقعی را مشخص می‌کند؛ `KAVENEGAR_API_KEY` و در صورت نیاز `KAVENEGAR_SENDER` از حساب Kavenegar گرفته می‌شوند.
- اگر API key خالی باشد backend به `ConsoleSMSBackend` می‌رود: هیچ پیامک واقعی ارسال نمی‌شود. این fallback فقط event بدون شماره/محتوای مشتری را log می‌کند.
- پس از تنظیم، یک فرم آزمایشی کنترل‌شده ثبت کنید و رسید واقعی provider/تلفن مقصد را مستقل از رکورد Contact تأیید کنید. موفقیت فرم یا وجود Lead اثبات ارسال SMS نیست؛ نتیجهٔ ناموفق با event `kavenegar_sms_failed` پایش می‌شود.

### ترتیب آزمون Production (بعد از دسترسی به هاست)

1. در محیط آزمایشی/با ورودی صریحاً آزمایشی، یک فرم معتبر ثبت کنید؛ پاسخ API باید موفق باشد و Contact و Lead در admin/DB موجود باشند.
2. ایمیل را جداگانه بررسی کنید: backend SMTP واقعی، log رویداد، و دریافت در صندوق کنترل‌شده.
3. SMS را جداگانه بررسی کنید: رسید واقعی ارائه‌دهنده و دریافت روی شمارهٔ آزمایشی مجاز.
4. اگر یکی از کانال‌ها غیرفعال است، آن را به‌عنوان «خاموش» ثبت کنید، نه «موفق». از دادهٔ مشتری واقعی برای تست استفاده نکنید.
5. این تست‌ها باید با حساب واقعی و مجاز مالک هاست انجام شوند؛ تست‌های خودکار repo شبکهٔ واقعی ارسال نمی‌کنند.

## ۵. Upload و Media

- کد فعلی برای تصویر ۵ MB و سند ۱۰ MB سقف پیش‌فرض دارد؛ کلیدهای runtime واقعی در `base.py` با نام‌های `MAX_IMAGE_UPLOAD_SIZE_MB` و `MAX_DOCUMENT_UPLOAD_SIZE_MB` هستند.
- سقف Passenger/Apache/LiteSpeed، فضای disk و quota حساب ممکن است از validator برنامه کمتر باشد؛ از provider مقدار limit را بگیرید و درخواست‌های درون حد و بیش‌ازحد را تست کنید.
- `MEDIA_ROOT` پایدار و writable باشد و با release جدید پاک نشود. Media backup را روشن نگه دارید اگر فایل‌های کاربر/محتوا برای بازیابی لازم‌اند.
- symlink، Document Root و `.htaccess` را فقط پس از بررسی واقعی cPanel تنظیم کنید. پوشهٔ backup، env خصوصی، log و dump دیتابیس نباید از وب قابل دریافت باشند.
- کنترل‌های محتوای upload را دور نزنید؛ آزمون با فایل بی‌خطر و مجاز انجام شود، نه فایل اجرایی یا اطلاعات واقعی کاربران.

## ۶. Backup خارج از هاست و آزمون Restore

`manage.py backup_db` به‌صورت محلی فایل دیتابیس، در صورت فعال‌بودن media آرشیو آن، و manifest دارای SHA-256 می‌سازد. `BACKUP_RETENTION=7` فقط چرخش فایل‌های محلی را کنترل می‌کند. بکاپ روی همان حساب/دیسک، حتی اگر Cron روزانه باشد، **offsite نیست**.

### سیاست اجرایی لازم (provider هنوز انتخاب/تأیید نشده)

1. زمان‌بندی Cron را طبق cPanel واقعی فعال کنید؛ پس از اجرا exit status، زمان اجرا، وجود فایل‌های db/media/manifest و فضای آزاد را کنترل کنید. مسیر Cron/log را بیرون از public document root نگه دارید.
2. انتقال پس از ساخت به مقصدی مستقل از هاست/حساب Production انجام شود؛ مقصد، رمزگذاری، احراز هویت، versioning، retention، دورهٔ نگهداری و مسئول دسترسی را مالک سیستم انتخاب و مستند کند. این راهنما vendor یا زمان نگهداری جدیدی تحمیل نمی‌کند.
3. انتقال با کانال امن انجام شود؛ فایل‌ها در مقصد private/encrypted باشند. SHA-256 هر artifact را با manifest مبدأ مقایسه کنید و نتیجه را با تاریخ/نسخه ثبت کنید. Manifest به‌تنهایی اثبات انتقال کامل یا قابلیت restore نیست.
4. دوره‌ای طبق سیاست مالک، بازیابی کامل را در محیط جداگانه با database و media root آزمایشی انجام دهید. ابتدا artifact منتقل‌شده را verify، سپس DB و media را restore، برنامه را بالا بیاورید و integrity/صفحه/فایل‌ها را بررسی کنید. تاریخ، زمان بازیابی، مدت، موارد ناموفق و اقدام اصلاحی ثبت شود.
5. **`scripts/restore_backup.sh --db ... --yes` بازنویس و مخرب است.** آن را هرگز با credential یا target دیتابیس Production هنگام تمرین اجرا نکنید. برای DB جدا و media root جدا استفاده کنید؛ آرگومان‌های `--yes` و `--skip-pre-backup` صرفاً برای آزمون خودکار/رویهٔ کنترل‌شده‌اند، نه مجوز حذف مرحلهٔ ایمنی.
6. Restore Production فقط با مجوز صریح مالک، توقف/maintenance کنترل‌شده، بکاپ safety قبل از restore و بررسی مقصد/نسخه انجام شود. اگر برنامه‌های restore testable نیستند یا offsite وصول نشده، این وضعیت را «آماده» علامت نزنید.

## ۷. Error log، health check و alerting

- **Django:** در Production از structured JSON logging به stdout استفاده می‌شود. محل جمع‌آوری/نگهداری واقعی stdout/stderr را از Setup Python App/Passenger و provider تعیین کنید؛ مسیر `stderr.log` را بدون مشاهده در cPanel فرض نکنید. دسترسی، retention و alert برای خطاهای 5xx، `contact_email_notification_failed`, `kavenegar_sms_failed` و Cron failure را تنظیم کنید. logها را از secret، session/cookie، محتوای فرم و اطلاعات تماس پاک نگه دارید.
- **Next.js:** `frontend/deploy/server.js.example` خطای handler و startup را با `console.error` ثبت می‌کند. این خروجی را از log اپ Node در cPanel پیدا کنید؛ یک خطای آزمایشی کنترل‌شده را در staging log کنید و مطمئن شوید query/tokenهای حساس ثبت نمی‌شوند.
- **Health عمومی:** `/api/v1/health/` باید از مسیر عمومی same-origin status موفق و checkهای DB/cache سالم برگرداند. این endpoint سلامت پایه را می‌سنجد و تحویل ایمیل/SMS، upload، backup، یا restore را اثبات نمی‌کند.
- **Health مسیر مستقیم Python:** در توپولوژی تأییدشده، `/backend/api/v1/health/` را هم آزمایش کنید. Prefix `/backend` تا زمان تأیید cPanel قطعی نیست.
- **Health proxy:** `/api/v1/health/proxy/` فقط با نشست مدیر برای بررسی IP/proxy قابل استفاده است؛ آن را endpoint عمومی مانیتورینگ قرار ندهید.
- مانیتور بیرونی فقط endpoint عمومی بی‌خطر را دوره‌ای بررسی کند؛ مالک باید از ابزار/فاصله/کانال اعلان موجود در حساب هاست استفاده کند. این سند ابزار مانیتورینگ یا SLA خاصی را فرض نمی‌کند.
- پس از deploy/restart، response code، زمان پاسخ، database/cache، logهای Python/Node و Cron را با timestamp ثبت کنید. `check --deploy` لازم است اما جای آزمون واقعی health و اعلان را نمی‌گیرد.

## ۸. چک‌لیست تکمیل مالک هاست

- [ ] host canonical، aliasها، Python Application URL/prefix، Document Root، Passenger routing و proxy headers از cPanel/provider تأیید شدند.
- [ ] متغیرهای Python و Node در پنل App مربوطه ثبت و پس از restart از طریق رفتار اپ بررسی شدند؛ هیچ secret در Git یا log نیست.
- [ ] `python manage.py check --deploy` با Production env/Cron واقعی بدون issue حل‌نشده اجرا شد؛ خروجی بررسی شده و شامل secret نیست.
- [ ] API health مستقیم و proxied، TLS/redirect، secure cookies و مسیر admin/static/media آزمایش شدند.
- [ ] ثبت Contact/Lead در DB و ایمیل واقعی و SMS واقعی جداگانه آزموده و نتایج هرکدام (موفق/غیرفعال/ناموفق) ثبت شدند.
- [ ] Upload درون حد مجاز و reject فراتر از حد، با سقف provider هم‌خوان است؛ media پایدار و خارج از document root امن است.
- [ ] Cron بکاپ موفق است؛ artifactها به مقصد offsite مستقل منتقل، SHA-256 تطبیق و restore آزمایشی در محیط جداگانه تکمیل شده است.
- [ ] محل logهای Django/Next، retention، دسترسی، بررسی Cron و مسیر escalation/alert در cPanel واقعی معلوم و بررسی شده است.

**این چک‌لیست از روی repository قابل تیک‌زدن نیست.** هر مورد فقط پس از اجرای واقعی و مشاهدهٔ شواهد در حساب هاست تکمیل شود.
