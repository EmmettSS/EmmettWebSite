# گزارش بستن معیارهای مهاجرت Admin بومی — ۲۰۲۶-۱۱-۱۲

این گزارش پیگیریِ ممیزی خط مبنای فاز ۰ است. فایل‌های `03-feature-parity.fa.md` و
`05-admin-jazzmin.fa.md` وضعیت مشاهده‌شدهٔ پیش از مهاجرت را حفظ می‌کنند؛ این سند
نتیجهٔ اصلاح و راستی‌آزمایی بعدی را ثبت می‌کند، نه این‌که سابقهٔ یافته‌های اولیه را
بازنویسی کند.

## ۱. وضعیت معیارهای مهاجرت

| معیار | شاهد | نتیجه |
|---|---|---|
| حذف وابستگی و integration واقعی Jazzmin | حذف از `backend/requirements.txt` و `INSTALLED_APPS`، نبود `JAZZMIN_SETTINGS`/`JAZZMIN_UI_TWEAKS`، قالب‌ها و دارایی‌های مستقل؛ `emmett_admin.E005` بازگشت اپ را رد می‌کند | **PASS** |
| حفظ ثبت مدل‌ها و رفتار ادمین | `test_admin_surface.py` قید ساختاری registry، permission، soft-delete، import policy، publish workflow و search را برای همهٔ مدل‌های مورد انتظار بررسی می‌کند | **PASS** |
| حفظ داشبورد، انتشار و حسابرسی | KPI/cache، publish/draft/archive، `AuditLog`، moderation و ویجت‌های فعالیت در قالب بومی باقی مانده‌اند | **PASS** |
| حفظ import/export | منابع، مجوزها، پیش‌نمایش دو مرحله‌ای، تراکنش، escaping فرمول CSV و log export دست‌نخورده‌اند؛ آزمون‌های exchange/surface پاس می‌شوند | **PASS** |
| حفظ 2FA و امنیت ورود | `django-otp`، TOTP، recovery code، lockout و اجبار `ADMIN_2FA_REQUIRED` در production؛ قالب‌های برندشدهٔ setup/verify/status/recovery | **PASS** |
| قالب برندشدهٔ دو‌زبانه | `base_site`, `index`, `login`, `nav_sidebar`, `app_list`, switcher، 2FA و export در `backend/templates/admin/`؛ `fa` راست‌به‌چپ و `en` چپ‌به‌راست | **PASS** |
| حذف وابستگی CDN برای Admin | فونت‌ها، icon sprite و jQuery UI ترجمه‌ها self-hosted؛ اسکریپت/stylesheet خارجی در صفحات ممیزی‌شده هم‌مبدأ هستند | **PASS** |
| CSP ادمین | `script-src 'self'`، بدون inline script؛ `style-src` به‌دلیل widgetهای native Django inline style را می‌پذیرد؛ CSP API تغییر نکرد | **PASS** |
| سرریز و ظاهر واکنش‌گرا | Playwright با login واقعی، دو locale و ۶ عرض ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴/۱۴۴۰/۱۹۲۰، روی login/dashboard/service list/service form/2FA status؛ ۱۲ مورد Admin همگی سبز | **PASS** |
| رگرسیون کل فرانت‌اند | کل suite مرورگر: **۷۲/۷۲** تست، شامل Admin، SEO، فرم‌ها، ثبت‌نام، جست‌وجو، صفحات عمومی و responsive | **PASS** |

## ۲. نتایج گیت‌های محلی

| گیت | نتیجهٔ اجرا |
|---|---|
| Backend pytest + coverage | **۵۷۶ passed**؛ پوشش اپ‌ها **۹۴٪** (آستانهٔ گیت ۸۵٪) |
| Ruff lint / format و Black | **PASS**؛ ۲۵۸ فایل Ruff-format و ۲۵۷ فایل Black بررسی شدند |
| mypy strict | **PASS**؛ ۲۵۲ فایل منبع |
| Bandit | **PASS**؛ ۱۱٬۳۸۱ LOC، مورد Medium/High ندارد (۶ مورد Low اطلاعاتی) |
| Django system check و migration drift | **PASS**؛ بدون خطا و بدون migration تازه |
| ترجمه‌ها | `scripts/i18n.py check` **PASS**؛ کاتالوگ فارسی کامل و تازه است |
| OpenAPI | `spectacular --validate --fail-on-warn` **PASS** |
| `collectstatic` | **PASS**؛ ۱۸۹ فایل کپی و ۵۱۷ فایل post-process شدند |
| Production deploy checks | `check --deploy --fail-level WARNING` **PASS** با محیط production-like |
| Frontend format / lint / typecheck | **PASS** |
| Vitest coverage | **PASS**؛ statements 95.75%، branches 80.59%، functions 94.32%، lines 97.08% |
| Next production build و verify rendering | **PASS**؛ ۱۴ مسیر عمومی اجباری و ۶۱ مسیر pre-render، بدون `<h1>` نامرئی |
| Secret scan | **PASS**؛ ۶۱۳ فایل بررسی‌شده |
| npm audit | گیت `--audit-level=high` **PASS**؛ ۸ advisory با شدت moderate در زنجیرهٔ ESLint/TypeScript باقی است و مورد high/critical گزارش نشد |

سوئیت backend هنگام اجرای کامل ۲۱۷ warning غیرمسدودکننده گزارش کرد؛ هیچ‌کدام باعث شکست تست یا گیت پوشش نشدند. در اجرای اولیهٔ پس از حذف Jazzmin، یک تست نگهبان تلاش می‌کرد پکیج حذف‌شده را import کند؛ fixture اصلاح شد تا وجود ورودی legacy را بدون نصب/بارگذاری دوبارهٔ Jazzmin شبیه‌سازی کند. اجرای نهایی ۵۷۶ تست سبز است.

## ۳. بررسی بصری مرورگر

تصویرهای login، dashboard، فهرست/فرم سرویس و وضعیت 2FA در عرض ۳۲۰/۳۹۰ برای
`fa` و ۳۲۰ برای `en` به‌صورت دستی بازبینی شدند. محتوا در viewport می‌ماند؛ header
در موبایل wrap می‌شود؛ منوی کناری در حالت بسته document را عریض نمی‌کند؛ جدول فهرست
رفتار واکنش‌گرای خودش را نگه می‌دارد. Playwright برای هر سطح، screenshot به گزارش
آزمون attach می‌کند. نسخه‌های کمکی محلی در
`frontend/test-results/admin-visual-review/` هستند و عمداً به Git اضافه نشده‌اند.

## ۴. محدودیت‌ها و کارهای بیرون از این بستن

- MySQL 8، cPanel/Passenger واقعی و اتصال providerهای بیرونی در sandbox موجود نبودند؛ **آزموده نشدند**.
- Production deploy یا تغییر دادهٔ production انجام نشد.
- ۸ مورد npm audit با شدت moderate به‌دلیل نیاز `npm audit fix --force` به ارتقای breaking در زنجیرهٔ lint دست‌نخورده ماندند؛ گیت high/critical سبز است.
- اشاره‌های Jazzmin در گزارش‌های خط مبنا، ADRهای تاریخی و نگهبان رگرسیون باقی می‌مانند. هیچ dependency، تنظیم یا دارایی runtime از Jazzmin/AdminLTE/Bootstrap بارگذاری نمی‌شود.

## ۵. نتیجه

معیارهای مهاجرت Admin بومی و راستی‌آزمایی فاز ۰ در محیط محلی/CI-comparable بسته شدند.
این نتیجه **آمادگی دیپلوی production را اعلام نمی‌کند**؛ پیش از استقرار، MySQL،
Passenger/cPanel و providerهای واقعی باید در محیط مقصد جداگانه تأیید شوند. هیچ commit،
push یا deployment در زمان ثبت این گزارش انجام نشده است.
