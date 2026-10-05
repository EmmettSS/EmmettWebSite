# ADR-0033: سخت‌سازی امنیتی — CSP، ۲FA ادمین، قفل ورود، بکاپ و مدیریت راز

**وضعیت:** پذیرفته‌شده — واگذاری مالک محصول در 2026-10-05 (پاسخ ۱۴: افزودن پکیج ۲FA مجاز؛ پاسخ ۱۵: استراتژی backup با اقتضای پروژه؛ پاسخ ۱۱/۱۲/۱۳: طبق ترجیح پروژه)<br>
**تاریخ:** 2026-10-05<br>
**دامنه:** فاز ۷ (Security)<br>
**مرتبط با:** ADR-0007, 0011, 0013, 0015, 0027, 0031<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

قانون ۱۶ فهرستی از الزامات امنیتی دارد (CSRF/XSS/SQLi/Rate Limit/CSP/HSTS/Cookie امن/
Audit Log) و دامنهٔ فاز ۷ صریحاً OWASP Top 10، 2FA اختیاری ادمین، Audit Log، استراتژی
Backup و محافظت brute-force را می‌خواهد. وضعیت پیش از فاز ۷:

- هدرهای امنیتی فقط تا حد پیش‌فرض جنگو (`X-Content-Type-Options`، `X-Frame-Options`)؛
  هیچ CSP نبود، در حالی که فرانت nonce داشت (ADR-0016) و ادمین (Jazzmin) inline style/script
  فراوان دارد.
- ورود هیچ محدودیت نرخ/قفل نداشت؛ شکست ورود ثبت Audit می‌شد ولی شمارشی وجود نداشت.
- ادمین فقط رمز عبور داشت؛ برای پنل مدیریتی SaaS این کافی نیست.
- هیچ ابزار پشتیبان‌گیری در ریپو نبود و روی هاست اشتراکی cPanel نه cron مدیریت‌شده داریم
  نه تضمین وجود `mysqldump` در PATH.
- رازها در `.env` (django-environ) بودند، ولی چک‌لیست عملی «چه کلیدی، کجا، با چه حداقل
  دسترسی» مستند نبود.

## ۲. گزینه‌ها

| موضوع | گزینه‌ها | تصمیم |
|---|---|---|
| CSP | A) سخت در همه‌جا B) nonce فقط فرانت C) **دو سیاست جدا: API/غیرادمین سخت، ادمین سازگار با Jazzmin** | **C** |
| ۲FA | A) TOTP خودی B) `django-otp` C) `django-allauth` MFA | **B** (`django-otp==1.7.3` + `qrcode==8.2`) |
| قفل ورود | A) throttle DRF B) **قفل مبتنی بر cache با پنجرهٔ زمانی و scope حساب+IP** | **B** |
| بکاپ | A) `mysqldump` اجباری B) **چند-strategy: SQLite `VACUUM INTO`، MySQL `mysqldump` با fallback `dumpdata`** | **B** |
| رازها | A) در کد B) **`.env` + django-environ + چک System Check** | **B** |

## ۳. تصمیم

### الف) هدرها و CSP
`SecurityHeadersMiddleware` (apps/core/middleware.py) سیاست را از `core.security.build_csp_policy`
می‌گیرد: برای API و پاسخ‌های غیرادمین `default-src 'none'; script-src 'self'`، و برای ادمین
`default-src 'self'` با `unsafe-inline` (نیاز Jazzmin — ADR-0027). `CSP_REPORT_ONLY`،
`CSP_REPORT_URI`، `CSP_IMG_SRC` و `CSP_FRAME_ANCESTORS` از env می‌آیند. Referrer
`strict-origin-when-cross-origin`، Permissions-Policy `camera=(), microphone=(), geolocation=()`
و COOP `same-origin` سراسری‌اند. **`X-Frame-Options` و `frame-ancestors` عمداً تنظیم نشده‌اند**:
پیش‌نمایش محیط توسعه در iframe cross-origin اجرا می‌شود و فعال‌کردن آن preview را می‌شکند؛
این تصمیم در `.env.example`/CHANGELOG برای محیط production یادآوری شده است.

دو قاعدهٔ دقیق برای جلوگیری از CSP شُل‌شده:

- پاسخ‌های **API** در همهٔ محیط‌ها (از جمله dev) همیشه `frame-ancestors 'none'` می‌گیرند؛
  استثنای dev فقط به صفحهٔ HTML ادمین تعلق دارد.
- مقدار **خالی** `DJANGO_FRAME_ANCESTORS` (همان حالتی که `.env.example` دارد) به دایرکتیو
  تهی منجر نمی‌شود؛ کد به پیش‌فرض dev (`'self'`) یا prod (`'none'`) برمی‌گردد، پس
  دایرکتیو ناقص/بی‌اثر در هدر ظاهر نمی‌شود (باگ کشف‌شده در همین فاز و قفل‌شده با تست).

### ب) ۲FA ادمین (اختیاری/اجباری با env)
`django-otp` با پلاگین‌های TOTP و Static (کدهای بازیابی). ماژول دامنه `apps/accounts/twofa.py`
روی آن سوار است و چهار مسئله را اضافه می‌کند:
- **QR به‌صورت SVG درون `data:`** (بدون CDN/فایل استاتیک، سازگار با CSP ادمین).
- **کلید Base32 برای ورود دستی** (`manual_secret`): `device.key` در django-otp هگز است و
  نمایش مستقیم آن در اپ کاربر «کد نامعتبر» می‌دهد (باگ کشف‌شده و رفع‌شده در همین فاز).
- **`is_verified(user)`** به‌عنوان نقطهٔ واحد بررسی (به‌جای `# type: ignore` پراکنده).
- **ضدbrute-force صفحهٔ تأیید کد**: ۶ رقم یعنی فقط ۱۰⁶ حالت؛ بدون محدودیت نرخ، حدس زدن
  عملی است. شمارش در cache با `security:otp_attempts:*` و قفل موقت پس از
  `OTP_MAX_ATTEMPTS` (پیش‌فرض ۵) برای `OTP_LOCK_SECONDS` (پیش‌فرض ۳۰۰ ثانیه).
  `AdminTwoFactorMiddleware` کاربر staff را در نبود دستگاه تأییدشده به setup و در نبود
  تأیید نشست به verify می‌برد؛ مسیرهای خود فرایند و logout مستثنا هستند (بدون حلقه).

### ج) قفل ورود و Audit
`LoginLockout` (apps/core/security.py) روی cache: پنجرهٔ `LOGIN_LOCKOUT_WINDOW`، آستانهٔ
`LOGIN_LOCKOUT_MAX_ATTEMPTS` و مدت `LOGIN_LOCKOUT_DURATION`؛ کلیدها هم با
`hash_identifier(email)` و هم با IP (تا هم حملهٔ حساب‌محور و هم IP-محور گرفته شود).
پاسخ API در حالت قفل `429` با `Retry-After` است. هر رویداد امنیتی
(`auth.account_locked`, `auth.login_blocked`, `auth.2fa_*`) در `AuditLog` ثبت می‌شود
(ADR-0013) — بدون ذخیرهٔ IP خام (هش‌شده) و بدون کد/راز در metadata.

### د) Backup
`manage.py backup_db` (apps/core/management/commands/backup_db.py):
- SQLite: `PRAGMA busy_timeout` سپس **`VACUUM INTO ?`** در مسیر موقت (روش `Connection.backup()`
  روی DB قفل‌شده در کد C هنگ می‌کند و SIGALRM هم اجرا نمی‌شود — نتیجهٔ discovery فاز ۷).
- MySQL: `mysqldump | gzip` و در نبود باینری، **fallback به `dumpdata` JSON گزیپ‌شده**.
- مدیا: `tar.gz` + `manifest-{stamp}.json` با checksum/hash برای صحت‌سنجی.
- نگه‌داری: `BACKUP_RETENTION` (پیش‌فرض ۷ نسخه) با هرس نام‌های قدیمی؛ مسیر از
  `BACKUP_DIR` و در حالت `--deploy` با System Check اعتبارسنجی می‌شود.

### ه) رازها
همهٔ رازها فقط در `.env` و از طریق `django-environ` خوانده می‌شوند (قانون ۵)؛ فهرست
کلیدهای فاز ۷ (`DJANGO_CSP_*`, `LOGIN_LOCKOUT_*`, `ADMIN_2FA_*`, `OTP_TOTP_ISSUER`,
`BACKUP_*`, `SEO_*`, `PUBLIC_SITE_URL`) در `.env.example` و در بخش Security راهنمای ادمین
مستند شده است. هیچ کلیدی در Git یا در گفتگو قرار نگرفت. هشدار: `SECRET_KEY` تنها رازی است
که چرخش آن همهٔ نشست‌ها را باطل می‌کند؛ رویه در راهنمای ادمین آمده است.

## ۴. پیامدها

- **مثبت:** OWASP Top 10 به‌صورت ماشین‌بررسی‌پذیر پوشش داده شد (تست‌های `test_security.py`
  و `TestTwoFactor*`: ۲۳ + ۲۲ تست)؛ بکاپ بدون وابستگی به cron/باینری خاص کار می‌کند؛
  ادمین بدون ۲FA دیگر نمی‌تواند داشته باشد (در production با `ADMIN_2FA_REQUIRED=True`).
- **منفی/ریسک:** CSP ادمین `unsafe-inline` دارد (اجبار Jazzmin) — با `CSP_REPORT_ONLY` و
  گزارش‌گیری قابل تنگ‌تر کردن است. قفل ورود cache-محور است؛ restart cache آن را آزاد می‌کند
  که برای دامنهٔ دفاعی این پروژه پذیرفته شده است. بکاپ روی SQLite یک نقطهٔ قفل کوتاه می‌گیرد
  (busy_timeout کنترل‌شده).
- **یافته‌های امنیتی رفع‌شده در همین فاز:** (۱) کد بازیابی تهی ⇒ بای‌پس ۲FA؛ (۲) اتکا به
  `cache.ttl()` ⇒ قفل ورود عملاً بی‌اثر (هر دو در `test_two_factor.py`/`test_security.py` قفل شده‌اند).

## ۵. اعتبارسنجی

- `backend/apps/core/tests/test_security.py` (۲۳ تست: CSP دو حالت، referrer/permissions/COOP،
  قفل/آزادسازی/تجاوز از آستانه، ۴۲۹ و Retry-After).
- `backend/apps/accounts/tests/test_two_factor.py` (۲۲ تست: setup/verify/recovery/lockout/reset
  — موفق و ناموفق) + `apps/core/tests/test_backup_db.py` (۹ تست، شامل MySQL fallback).
- `manage.py check` بدون خطا؛ System Checkهای فاز ۷ در `core.checks`:
  `W008` خاموش‌بودن CSP، `W009` (deploy) خاموش‌بودن اجبار ۲FA ادمین در production،
  `W010` (deploy) تنظیم‌نشدن کد Search Console، `W011`/`W012` (deploy) نبود/غیرقابل‌نوشتن
  پوشهٔ بکاپ و `W013` (deploy) ضعیف/نمونه‌بودن `SECRET_KEY`.
