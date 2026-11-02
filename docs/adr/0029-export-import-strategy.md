# ADR-0029: صادرات/واردات داده با `django-import-export`

**وضعیت:** پذیرفته‌شده — تأیید صریح مالک محصول در 2026-10-05 (پاسخ Q4: `django_import_export`)<br>
**تاریخ:** 2026-10-05<br>
**دامنه:** فاز ۶<br>
**مرتبط با:** ADR-0003, 0006, 0012, 0013, 0014, 0027, 0028<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

فاز ۶ باید «Export/Import (CSV/JSON)» را با **تست idempotency** تحویل بدهد: خروجی گرفته‌شده
از پنل باید بتواند دوباره وارد شود و هیچ رکورد تکراری/تغییر ناخواسته ایجاد نکند. ریپو تا
پایان فاز ۵ هیچ مسیر صادرات/واردات ادمین نداشت و همهٔ مدل‌ها دوزبانه‌اند
(`django-modeltranslation`: `title_fa`, `title_en`, ...) که برای پکیج‌های عمومی یک تلهٔ
شناخته‌شده است.

محدودیت‌ها: بدون وابستگی سنگین یا extras غیرضروری روی هاست اشتراکی (قانون ۶)، بدون
افزودن مجوز سفارشی (استفاده از `view`/`add` جنگو)، و ثبت رخداد import/export در لاگ ادمین.

## ۲. گزینه‌ها

| گزینه | مزیت | وضعیت |
|---|---|---|
| A. پیاده‌سازی دستی CSV/JSON | بدون وابستگی | رد: بازنویسی حلقهٔ خطا/اعتبارسنجی/تراکنش؛ نگه‌داری طولانی‌مدت |
| B. `django-import-export` (انتخاب‌شده) | استاندارد صنعتی، دو مرحله‌ای (پیش‌نمایش → تأیید)، تراکنشی، پشتیبانی از DRY-RUN/`diff` | پذیرش با محدودسازی فرمت‌ها و منابع |
| C. `django-import-export` + فرمت‌های پیش‌فرض (XLSX/ODS/YAML) | کامل‌تر | رد: `tablib` بدون extras در runtime خطا می‌دهد و extras یعنی وابستگی سنگین |
| D. ترکیب CSV-صادرات/JSON-واردات دستی | سبک | رد: دو قرارداد متفاوت، تست idempotency شکننده |

## ۳. تصمیم

1. **`django-import-export==4.4.1`** + `IMPORT_EXPORT_FORMATS = (CSV, JSON, TSV)`
   (پیش‌فرض پکیج XLSX/ODS/YAML است؛ عمداً محدود شده — دلیل در ADR-0010/قانون ۶).
2. **تراکنشی و ایمن**:
   - `IMPORT_EXPORT_USE_TRANSACTIONS = True` (واردات نیمه‌کاره رها نمی‌شود).
   - `IMPORT_EXPORT_ESCAPE_FORMULAE_ON_EXPORT = True` و
     `ESCAPE_ILLEGAL_CHARS_ON_EXPORT = True` (جلوگیری از CSV/formula injection در Excel —
     محتوای Lead/Contact می‌تواند با `=`, `+`, `-`, `@` شروع شود).
   - `IMPORT_EXPORT_SKIP_ADMIN_LOG = False` (واردات در `admin.LogEntry` ثبت می‌شود).
   - **حسابرسی صادرات:** پکیج در نسخهٔ ۴.۴.۱ برای صادرات هیچ ردی حسابرسی نمی‌سازد؛ پس
     `EmmettImportExportAdmin.export_action` هر صادرات فایل را در `AuditLog` ثبت می‌کند
     (`<app>.<Model>.exported` با تعداد ردیف، فرمت و نام فایل) — لازمهٔ پیگیری
     «چه کسی دادهٔ لید/کاربر را بیرون برد» (قانون ۱۶ و ADR-0013).
   - مجوز صادرات = `view`، واردات = `add` (`IMPORT_EXPORT_*_PERMISSION_CODE`).
3. **جریان دو مرحله‌ای واردات حفظ می‌شود**: بارگذاری فایل = پیش‌نمایش (dry-run) و
   نمایش diff؛ تثبیت فقط با POST دوم روی `process_import`.
4. **کلید پایدار برای هر مدل** (`import_id_fields`) به‌جای `pk` عددی:
   `slug` (Service/Project/BlogPost/Course/Category/Tag)، `(course, order)` برای Lesson،
   `name` برای Instructor، `project` برای CaseStudy، `(author_name, author_company)` برای
   Testimonial، `full_name` برای TeamMember، `(namespace, key, locale)` برای Translation،
   `key` برای Catalog، `(catalog, key)` برای CatalogOption، `(feature, locale, version)` برای
   PromptTemplate، `rule_key` برای GuardrailRule و `delivery_scope` برای EstimationRule.
   `accounts.Profile` با `("user",)`. (تست idempotency هر مدل روی همین کلیدها بسته شده است.)
5. **فقط صادرات** (بدون واردات) برای داده‌هایی که منبع حقیقتشان کاربر/سیستم است:
   `ai_engine.AIRequest/AISuggestion/AIConcept/AIContentArtifact`, `accounts.Favorite/User`,
   `blog.Comment`, `academy.Enrollment` و همهٔ مدل‌های `leads` — این ادمین‌ها
   `ImportDisabledMixin` دارند و `has_import_permission` آن‌ها `False` است.
6. **نرمال‌سازی «خالی = None»** با override `EmmettResource.skip_row`:
   ستون‌های ترجمهٔ `*_fa/_en` در DB `nullable` هستند ولی ستون‌های پایه `NOT NULL DEFAULT ''`.
   بدون این نرمال‌سازی، round-trip یک رکورد باعث diff کاذب `''` در برابر `None` و
   `totals["update"]` نادرست می‌شد (باگ واقعی کشف‌شده در تست idempotency). گاردهای
   `skip_unchanged`، نبود `skip_diff`/`import_validation_errors`، `original.pk` و
   نبود `ManyToManyWidget` همه بررسی می‌شوند تا رفتار پکیج خراب نشود.
7. **فقط ستون‌های صریح**: هر `Resource` در `apps/<app>/resources.py` فیلدهایش را صریح
   اعلام می‌کند (بدون `__all__`) تا تغییر مدل، ستون ناخواسته/حساس به فایل صادرات اضافه نکند؛
   `ExportFormatsMixin` هم همان سه فرمت را به فرم ادمین می‌دهد و نام فایل با پیشوند برند و
   تاریخ میلادی ساخته می‌شود (`emmett-<model>-YYYYmmdd-HHMM.csv`).

## ۴. دلیل

- پکیج بالغ است، جریان دو مرحله‌ای/تراکنشی و diff دارد و «تست idempotency» را به یک تست
  واقعی تبدیل می‌کند، نه ادعای مستندات.
- محدودکردن به CSV/JSON/TSV وابستگی اضافه به هاست اشتراکی تحمیل نمی‌کند.
- مجوزهای `view`/`add` جنگو کافی است؛ هیچ مدل/فیلد مجوز سفارشی لازم نشد.
- سیاست «صادرات برای همه، واردات فقط برای دادهٔ مرجع» از بازنویسی دادهٔ کاربران/لیدها با
  یک فایل اشتباه جلوگیری می‌کند.

## ۵. پیامدها

**مثبت:** پشتیبان‌گیری/مهاجرت دادهٔ مرجع (خدمات، کاتالوگ، پرامپت، ترجمه‌ها) با فایل تمیز؛
گزارش‌گیری CSV برای Excel؛ رد حسابرسی در لاگ ادمین؛ فرمول‌ها در Excel اجرا نمی‌شوند.

**منفی/ریسک:** (۱) `skip_row` روی رفتار داخلی پکیج سوار است — با ارتقای `django-import-export`
باید تست‌های حرکت/عدم‌حرکت (idempotency) دوباره اجرا شود؛ در همین ADR ثبت شده.
(۲) `format` در فرم ادمین **ایندکس عددی** است (`"0"`=CSV، `"1"`=JSON، `"2"`=TSV) و
GET با `?format=csv` خطا می‌دهد — جزئیات در تست‌های `test_admin_exchange.py` قفل شده است.

## ۶. معیار پذیرش (تست‌شده در `apps/core/tests/test_admin_exchange.py`، ۱۶ تست)

- [x] فهرست فرمت‌های مجاز دقیقاً `{CSV, JSON, TSV}` است (هم `settings` و هم فرم ادمین).
- [x] صادرات از view ادمین: POST با `format` ایندکس + انتخاب ستون‌ها → CSV با BOM/سرصفحهٔ
      دوزبانه و ستون‌های ترجمه.
- [x] escape فرمول‌ها از مسیر واقعی پکیج (`base_formats.CSV().export_data`) تست شده است.
- [x] واردات: مسیر دو مرحله‌ای (پیش‌نمایش + `process_import`) و خواندن مقادیر پنهان از
      `form.initial` (نه `field.initial` که روی فرم bound مقدار `None` می‌دهد).
- [x] idempotency: export → import مجدد یک رکورد ⇒ `totals["update"] == 1` و
      `totals["new"] == 0` و هیچ ستونی تغییر نمی‌کند (نرمال‌سازی `''`/`None`).
- [x] ادمین‌های فقط‌خواندنی: `has_import_permission` = `False` و `get_import_formats()` = `[]`.
- [x] هر مدل `BaseModel` (به‌جز استثناهای مستند) `resource_class` صریح دارد
      (`test_admin_surface.py`).
- [x] هر صادرات ادمین یک ردی `AuditLog` می‌سازد و فرم نامعتبر (بدون ستون) ردی نمی‌سازد
      (`test_admin_exchange.py::TestExportAuditTrail`).
