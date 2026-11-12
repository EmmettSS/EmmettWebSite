# فاز ۰ — ممیزی Admin و Jazzmin

## ۱. سطح فعلی ادمین

۳۶ `@admin.register` در اپ‌ها دیده شد. مدل‌های دامنه‌ای عموماً از `SoftDeleteAdminMixin`، `EmmettImportExportAdmin` و در محتوای قابل انتشار از `PublishWorkflowMixin` استفاده می‌کنند. `AuditLog` از soft-delete restore مستثنا است. مدل‌های امنیتی/کاربری خاص import disabled دارند.

قابلیت‌های موجود:

- داشبورد KPI با template tag و SVG درون‌خطی، cache 120s و بودجهٔ کوئری.
- گردش draft/published/archived و نرم‌حذف/بازگردانی.
- import/export با CSV/TSV/JSON، schema_version و formula-escape.
- moderation نظرات با AuditLog.
- مدیریت Translation، Redirect، FAQ، Media، SiteSettings و SearchIndexEntry.
- AI admin: درخواست/پیشنهاد/مفهوم readonly؛ revoke share؛ approve/reject artefact با stale guard؛ archive برای PromptTemplate.
- 2FA با django-otp، recovery code، lockout و middleware اجبار.

## ۲. وابستگی‌های Jazzmin که باید حذف شوند

| محل | وابستگی |
|---|---|
| `backend/config/settings/base.py` | `jazzmin` در INSTALLED_APPS، `JAZZMIN_SETTINGS`, `JAZZMIN_UI_TWEAKS` |
| `backend/requirements.txt` | `django-jazzmin==3.0.5` |
| storage | `NonStrictCompressedManifestStaticFilesStorage` به‌خاطر staticهای Jazzmin |
| قالب‌های 2FA | ارث‌بری/کلاس‌های Bootstrap/Jazzmin |
| CSS تم | اتکا به AdminLTE/Bootstrap: `.app-sidebar`, `.brand-link`, `--lte-*`, `.card`, `.btn` |
| تست‌ها | `test_admin_theme`, `test_admin_checks`, `test_deployment_readiness` و CI settings |
| footer/branding | نسخهٔ Jazzmin در footer دیده می‌شود |
| static/vendor | AdminLTE/Bootstrap/FontAwesome/Jazzmin assets |

ADR-0027 و ADR-0028 باید با ADR جدید جایگزینی Admin بومی به‌روزرسانی شوند؛ تاریخ تصمیمات قبلی حفظ شود.

## ۳. نقص‌های مشاهده‌شده در مرورگر محلی

| شناسه | نقص | شدت | شاهد |
|---|---|---|---|
| ADM-01 | پس از login مستقیم به `/admin/login/` بدون next، redirect به `/accounts/profile/` و 404 | متوسط | لاگ سرور و مرورگر |
| ADM-02 | سرریز افقی داشبورد/لیست‌ها؛ `scrollWidth` بسیار بزرگ‌تر از viewport | متوسط | 1440: scrollWidth=11440؛ 390: scrollWidth=10390 |
| ADM-03 | برند/لوگو در sidebar از viewport بیرون می‌زند | کم/متوسط | brand-link right=1457 در viewport=1440 |
| ADM-04 | صفحهٔ login در capture مرورگر کنتراست/رندر ناپایدار دارد | متوسط | اسکرین‌شات و CSS متکی backdrop/Bootstrap |
| ADM-05 | برخی برچسب‌های فیلتر/اپ untranslated هستند (`categories`, `Otp_Static`, `Otp_Totp`) | کم | اسکرین‌شات‌ها |
| ADM-06 | footer نام/نسخهٔ Jazzmin را نشان می‌دهد | کم | اسکرین‌شات services |

این نقص‌ها در فاز ۰ اصلاح نشدند. ADM-02/03 باید در بازطراحی بومی با تست عرض‌های ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴/۱۴۴۰/۱۹۲۰ بسته شوند.

## ۴. محدودیت تست بصری

تست‌های فعلی ادمین عمدتاً ساختاری/تمپلیتی هستند و صریحاً اعلام می‌کنند مرورگر واقعی در محیط تست نبوده است. بنابراین PASSED بودن pytest به‌معنای سالم بودن چیدمان بصری نیست. اسکرین‌شات‌های این فاز نقص‌های چیدمان را نشان دادند.

## ۵. معیار پذیرش حذف Jazzmin

1. `django-jazzmin` از requirements، INSTALLED_APPS، settings، staticها، قالب‌ها، تست‌ها و CI حذف شود.
2. هیچ ارجاع runtime به Jazzmin/AdminLTE/Bootstrap باقی نماند؛ grep و تست رگرسیون این را قفل کنند.
3. همهٔ ۳۶ ثبت فعلی و mixinهای publish/soft-delete/import-export حفظ شوند.
4. 2FA، recovery، lockout، AuditLog و permissionها بدون تضعیف کار کنند.
5. قالب‌های base/index/login/2FA/import/export بومی Emmett با fa-RTL/en-LTR ساخته شوند.
6. سرریز افقی در شش عرض هدف صفر باشد؛ فوکوس/کیبورد/screen-reader حفظ شود.
7. تست‌های حذف‌شدهٔ وابسته به Jazzmin با تست معادل جایگزین شوند، نه صرفاً حذف.
8. pytest، lint/typecheck، build، E2E و deploy checks پس از حذف PASSED شوند.
