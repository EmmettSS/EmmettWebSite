# ADR-0043: جایگزینی Jazzmin با Django Admin بومی و پوستهٔ Emmett

**وضعیت:** پذیرفته‌شده — مهاجرت به Admin بومی بنا به درخواست مالک محصول (2026-11-12)<br>
**تاریخ:** 2026-11-12<br>
**دامنه:** `backend/config/settings/base.py`، `backend/apps/core/admin_theme.py`،
`backend/apps/core/checks.py`، `backend/apps/core/security.py`،
`backend/static/admin_theme/`، `backend/templates/admin/`،
`backend/apps/accounts/twofa_views.py`، `.github/workflows/ci.yml`،
`frontend/e2e/admin-responsive.spec.ts` و راهنمای ادمین<br>
**مرتبط با:** ADR-0013 (AuditLog)، ADR-0027 (تم/RTL)، ADR-0028 (داشبورد و workflow)،
ADR-0029 (import/export)، ADR-0030 (i18n)، ADR-0033 (CSP/2FA)، ADR-0037 (E2E)،
ADR-0038 (CI)؛ گزارش خط مبنا در `docs/audit/2026-11-12-phase-0/`<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

ADR-0027 در اکتبر ۲۰۲۶، Jazzmin را به‌عنوان لایهٔ رابط Django Admin پذیرفته بود؛
پوستهٔ آن به دارایی‌ها و قراردادهای قالبی Jazzmin/AdminLTE/Bootstrap وابسته بود
و سیاست CSP ادمین برای سازگاری با آن، اسکریپت inline را مجاز می‌کرد. ممیزی
`docs/audit/2026-11-12-phase-0/` نشان داد که مسیر ورود، ظاهر دو‌زبانه، سرریز در
عرض‌های کوچک، وابستگی دارایی‌ها و ترجمه‌ها باید هم‌زمان اصلاح شوند.

مالک محصول خواستار مهاجرت به **Django Admin بومی** شد، با این قیود:

- هیچ ثبت مدل، permission، workflow، 2FA، import/export یا audit از بین نرود.
- رابط فارسی `fa-RTL` و انگلیسی `en-LTR`، با هویت بصری Emmett و دارایی‌های خودمیزبان.
- تجربهٔ واکنش‌گرا در عرض‌های ۳۲۰، ۳۹۰، ۷۶۸، ۱۰۲۴، ۱۴۴۰ و ۱۹۲۰ پیکسل.
- CSP ادمین تا حد ممکن محدود باشد و برای نمایش پنل به CDN یا اسکریپت inline وابسته نشود.
- تغییر ظاهری به migration دیتابیس یا بازنویسی API نیاز نداشته باشد.

## ۲. تصمیم

1. **Django Admin خود Django تنها چارچوب پنل است.** وابستگی و پیکربندی Jazzmin
   حذف شد؛ هیچ فایل runtime از AdminLTE/Bootstrap/Jazzmin بارگذاری نمی‌شود. یک
   system check با شناسهٔ `emmett_admin.E005` در صورت بازگشت ناخواستهٔ اپ Jazzmin
   در `INSTALLED_APPS` خطا می‌دهد.
2. **پوسته با قالب و دارایی‌های پروژه پیاده می‌شود.** قالب‌های `base_site`,
   `index`, `login`, `nav_sidebar`, `app_list`, قالب‌های 2FA و export با brand
   tokens و آیکون‌های Emmett ساخته شده‌اند. مسیرها در
   `ADMIN_THEME_TEMPLATES` تعریف و با `emmett_admin.E006` بررسی می‌شوند.
3. **ثبت‌ها و رفتارهای مدیریتی ثابت می‌مانند.** همهٔ ثبت‌های مدل موجود و قرارداد
   `SoftDeleteAdminMixin`, `PublishWorkflowMixin`, `EmmettImportExportAdmin`,
   permissionهای Django، moderation، `AuditLog` و dashboard حفظ می‌شوند.
   سیاست import برای مدل‌های کاربرمحور/امنیتی صریحاً disabled می‌ماند؛ تغییر
   پوسته به‌تنهایی مجوز یا دسترسی جدید اعطا نمی‌کند.
4. **2FA دست‌نخورده و در production اجباری باقی می‌ماند.** `django-otp`، TOTP،
   recovery codes، lockout و `ADMIN_2FA_REQUIRED=True` همچنان مسئول امنیت ورود
   staff هستند؛ فقط قالب‌های ورود/وضعیت/setup/verify/recovery بازطراحی شده‌اند.
5. **fa-RTL و en-LTR با دارایی‌های محلی ارائه می‌شوند.** فونت Vazirmatn، آیکون‌ها
   و jQuery UI موردنیاز تب‌های modeltranslation self-hosted هستند؛ stylesheet
   RTL فقط برای locale فارسی بارگذاری می‌شود. هیچ CDN خارجی پیش‌نیاز کارکرد پنل
   نیست.
6. **CSP ادمین سخت‌گیرانه‌تر می‌شود.** HTML پنل `script-src 'self'` و
   `connect-src 'self'` دارد؛ اسکریپت inline مجاز نیست و JavaScript/CSS خارجی
   باید هم‌مبدأ باشد. به‌دلیل widgetهای native Django، `style-src` هنوز
   `'unsafe-inline'` را برای styleهای inline می‌پذیرد؛ این اجازه به `script-src`
   سرایت نمی‌کند. سیاست CSP پاسخ‌های API از این تصمیم تغییر نمی‌کند.
7. **حالت موبایل drawer را از document scroll جدا می‌کند.** منوی ثابتِ خارج از
   صفحه نباید پهنای سند را زیاد کند؛ header و ابزارهای حساب در عرض کوچک wrap
   می‌شوند. جدول‌های قابل‌اسکرول همچنان رفتار داخلی خود را دارند.
8. **گارد مرورگری به CI افزوده می‌شود.** Playwright مسیر واقعی login را با حساب
   demo همان run طی می‌کند و login، dashboard، service list/form و وضعیت 2FA را
   در هر دو زبان و شش عرض می‌سنجد؛ پاسخ موفق، نبود سرریز، جهت صفحه و CSP را
   بررسی می‌کند. تصاویر هر سطح به گزارش تست attach می‌شوند.

## ۳. گزینه‌های بررسی‌شده و ردشده

| گزینه | نتیجه |
|---|---|
| نگه‌داشتن Jazzmin و اصلاح چند rule | رد شد؛ نگه‌داشتن dependency و محدودیت‌های قالب/CSP مشکل ریشه‌ای را باقی می‌گذاشت |
| نصب یک پوستهٔ سوم-party جدید | رد شد؛ هزینهٔ سازگاری و سطح وابستگی تازه‌ای می‌آورد و شرط خودمیزبانی/کنترل قالب را برآورده نمی‌کرد |
| بازنویسی کامل مدیریت داده در Next.js | رد شد؛ منطق permission، ثبت مدل‌ها و workflow موجود را دوباره‌پیاده‌سازی می‌کرد و خارج از دامنه بود |
| Django Admin بومی + template/CSS/JS خود پروژه | **انتخاب شد**؛ استفاده از قراردادهای رسمی Django، حفظ backend admin و امکان کنترل CSP/RTL بدون dependency پوسته |

## ۴. پیامدها

### مثبت

- وابستگی UI به Jazzmin/AdminLTE/Bootstrap و staticهای مربوط حذف می‌شود.
- اجرای JavaScript ادمین به اسکریپت‌های هم‌مبدأ محدود است؛ inline script و CDN لازم نیست.
- داشبورد، 2FA، import/export و گردش‌کار محتوا در همان admin registry و با همان مجوزها می‌مانند.
- RTL/LTR و اندازه‌های viewport به تست مرورگر واقعی تبدیل می‌شوند، نه فقط assertionهای template.

### مصالحه‌ها و ریسک‌ها

- CSS اختصاصی باید با ارتقای نسخهٔ Django و تغییر قالب‌های native بازبینی شود؛
  `ADMIN_THEME_TEMPLATES` و Playwright این سطح را رصد می‌کنند.
- style inline برای بعضی widgetهای استاندارد Django در CSP مجاز است؛ اسکریپت inline
  همچنان ممنوع است. حذف کامل inline style نیازمند بازطراحی/تغییر widgetهای upstream
  و در این تصمیم انتخاب نشد.
- اجرای محلی SQLite و CI، MySQL 8 یا cPanel/Passenger واقعی را اثبات نمی‌کند؛ هیچ
  deploy production در این تغییر انجام نشده است.

## ۵. معیار پذیرش و شواهد

| معیار | شاهد | نتیجهٔ راستی‌آزمایی |
|---|---|---|
| حذف Jazzmin از dependency و runtime configuration | `backend/requirements.txt`, settings و گارد `E005` | PASS |
| حفظ registry، permission و mixinهای سطح مدل | `apps/core/tests/test_admin_surface.py`, workflow/exchange tests | PASS |
| قالب‌های base/dashboard/login/navigation/2FA/export | `ADMIN_THEME_TEMPLATES` و `test_admin_theme.py` | PASS |
| فارسی/انگلیسی و محدودیت CSP | `test_security.py` و `e2e/admin-responsive.spec.ts` | PASS |
| ۶ عرض × ۲ locale، بدون overflow در ۵ سطح Admin | ۱۲ آزمون Admin مرورگری | PASS |
| Backend | `pytest --create-db`, coverage gate | 576 passed، 94% coverage |
| Frontend و E2E | Vitest coverage، build/render verification، Playwright | 72 E2E passed؛ Vitest: 95.75% statements، 80.59% branches، 94.32% functions، 97.08% lines |
| امنیت وابستگی‌های npm | `npm audit --audit-level=high` | PASS؛ ۸ مورد moderate در زنجیرهٔ ESLint/TypeScript باقی است، مورد high/critical نیست |
| system/deploy checks | Django check، migration drift، OpenAPI، `check --deploy --fail-level WARNING`، Bandit | PASS |

جزئیات، محدودیت‌های محیط و ماتریس آزمون در
[`docs/audit/2026-11-12-phase-0/08-native-admin-verification.fa.md`](../audit/2026-11-12-phase-0/08-native-admin-verification.fa.md)
ثبت شده‌اند.
