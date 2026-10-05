# Changelog

فرمت این فایل بر اساس [Keep a Changelog](https://keepachangelog.com/) است. هر فاز پروژه یک بخش مستقل دارد.

## [فاز ۷ — SEO، کارایی و امنیت] — 2026-10-05

دامنهٔ فاز طبق واگذاری صریح مالک محصول («اگر تمام نشده تمام کن سپس گزارش بده»؛
پاسخ ۱: SEO در Next.js، پاسخ ۲: دامنه از env، پاسخ ۶: JSON-LD روی همهٔ بخش‌ها،
پاسخ ۹: مجوز افزودن وابستگی تصویر، پاسخ ۱۰: معیار جانشین Lighthouse، پاسخ ۱۴:
۲FA با پکیج آماده) در سه محور اجرا شد و تصمیم‌ها در `ADR-0031`–`ADR-0033` ثبت شدند.

### SEO (`ADR-0031`)
- **منبع حقیقت URL و رندر در Next.js:** `src/lib/seo/{site,metadata,json-ld,redirects,feed,types}.ts`،
  `src/app/sitemap.ts`، `src/app/robots.ts`، `src/app/[locale]/opengraph-image.tsx` و
  `src/app/[locale]/{blog,academy}/rss/route.ts`. جنگو فقط داده/ادمین/فید سازگاری است.
- **دامنه از `PUBLIC_SITE_URL`** (نه hard-code، نه هدر `Host`)؛ در حالت `check --deploy`
  نبود آن خطای `emmett_admin.W007` است.
- **hreflang `fa-IR`/`en`/`x-default` + canonical خودارجاع** روی همهٔ صفحات عمومی و متادیتای
  پویا از `SiteSettings` (`buildPageMetadata`)؛ ۱۴ صفحه از این مسیر عبور کردند.
- **JSON-LD شش‌نوعه:** `Organization`+`WebSite` (ریشه)، `Article` (بلاگ/پروژه)، `Course`،
  `Service`، `BreadcrumbList` و `FAQPage` (FAQ از ادمین، با اندپوینت `/api/v1/seo/faq/?path=`).
- **OG/Twitter پویا** با تصویر ۱۲۰۰×۶۳۰ که متنش از کاتالوگ پیام‌ها می‌آید؛ رندر تصویر با
  `satori` دو سازگاری لازم داشت که در build کشف و رفع شد: نبود پشتیبانی از قالب `wOF2`
  (استفاده از نسخهٔ `.woff`) و نیاز به `direction: rtl` + زیرمجموعهٔ فونت لاتین برای متن‌های
  دوزبانه (بدون آن، نشان برند و نیم‌فاصله به‌هم‌ریخته رندر می‌شد).
- **sitemap/robots پویا** با `dynamic = "force-dynamic"` (چون API ممکن است در build خالی
  باشد)؛ مسیرهای noindex (`/profile`, `/search`, `/advisor`, `/estimate`, `/admin`, `/api`,
  `/i18n`, `/media`) از sitemap حذف و در robots Disallow می‌شوند.
- **ریدایرکت‌های مدیریت‌شده (۳۰۱/۳۰۲/۴۱۰)** از ادمین، در لبهٔ Next (`src/proxy.ts`) و در
  جنگو (`RedirectFallbackMiddleware`)؛ ۴۱۰ صفحهٔ HTML با `X-Robots-Tag: noindex` و
  نرمال‌سازی یکسان کلید در دو طرف + شمارش بازدید و کش.
- **RSS/Atom بلاگ و دوره** روی `/blog/rss` و `/academy/rss` (+ مسیر سازگاری
  `/api/v1/blog/rss/`)؛ مسیر قدیمی `rss.xml` با ۳۰۱ به مسیر جدید می‌رود.
- **تأیید Search Console** از ادمین (`search_console_verification`) با هشدار `W010` در
  production و متای مربوطه در فرانت.

### کارایی (`ADR-0032`)
- **معیار جانشین Lighthouse** (Lighthouse واقعی در sandbox بدون Chromium ممکن نیست):
  نبود `<img>` خام + AVIF/WebP + `sizes`، `font-display: swap` و فونت خودمیزبان،
  صفر وابستگی ثالث در مسیر بحرانی، و **سقف کوئری در تست**.
- **تصویر:** هر ۷ تگ `<img>` خام با `next/image` جایگزین شد (کاور بلاگ با `priority`،
  گالری پروژه با `fill`/`sizes`/lazy) و `next.config.ts` فرمت‌های `image/avif`/`image/webp`،
  `deviceSizes` پروژه و `minimumCacheTTL` سی‌روزه را اعلام می‌کند.
- **کش لایه‌ای:** `seo:sitemap:entries:v1`, `seo:settings:v1`, `seo:redirects:map:v1` +
  `revalidate` در فرانت؛ بار دوم sitemap و settings صفر کوئری است (قفل‌شده در تست).
- **فونت:** وزیرمتن ۷۰۰ برای وزن تیتر و `swap` برای همه؛ بودجهٔ بارگذاری در
  `src/lib/fonts.ts` مستند شد.
- **N+1:** هر endpoint عمومی با `select_related`/`prefetch_related` صریح؛ سقف‌ها در
  `test_performance_budget.py` (فهرست‌ها ≤ ۶ برای ۳ و ۱۲ آیتم، detail ≤ ۱۴، sitemap ≤ ۱۲).

### امنیت (`ADR-0033`)
- **CSP دو‌سیاستی:** API/غیرادمین `default-src 'none'; script-src 'self'` و ادمین
  `default-src 'self'` + `unsafe-inline` (اجبار Jazzmin)؛ با `DJANGO_CSP_REPORT_ONLY` و
  `DJANGO_CSP_REPORT_URI` قابل انتقال به حالت گزارش. Referrer، Permissions-Policy
  (`camera=(), microphone=(), geolocation=()`) و COOP `same-origin` سراسری.
  `X-Frame-Options`/`frame-ancestors` عمداً در dev باز است تا پیش‌نمایش iframe بشکند نشود.
- **۲FA ادمین** (`django-otp==1.7.3` + `qrcode==8.2`): TOTP با QR درون `data:`، کلید
  Base32 برای ورود دستی (`device.key` هگز است — باگ کشف و رفع شد)، کدهای بازیابی
  یک‌بارمصرف، و قفل موقت صفحهٔ تأیید پس از `OTP_MAX_ATTEMPTS`.
- **قفل ورود ضد brute-force** روی cache با پنجره/آستانه/مدت از env؛ پاسخ API `429` +
  `Retry-After`؛ کلیدها با هش ایمیل و IP تا هم حملهٔ حساب‌محور و هم IP-محور گرفته شود.
- **دو یافتهٔ امنیتی رفع‌شده:** کد بازیابی تهی ⇒ بای‌پس ۲FA، و اتکا به `cache.ttl()` ⇒
  قفل ورود عملاً بی‌اثر؛ هر دو با تست موفق/ناموفق قفل شده‌اند.
- **Audit Log** رویدادهای امنیتی (`auth.account_locked`, `auth.login_blocked`,
  `auth.2fa_*`) بدون IP خام و بدون راز.
- **بکاپ:** `manage.py backup_db` — SQLite با `VACUUM INTO` (+ `busy_timeout`)، MySQL با
  `mysqldump` و fallback به `dumpdata`، مدیا `tar.gz`، `manifest-{stamp}.json` و
  هرس بر اساس `BACKUP_RETENTION`؛ رویه در راهنمای ادمین توضیح داده شده است.
- **رازها:** همه از `.env` با django-environ؛ کلیدهای فاز ۷ به `.env.example` اضافه شدند
  (`DJANGO_CSP_*`, `DJANGO_FRAME_ANCESTORS`, `LOGIN_LOCKOUT_*`, `ADMIN_2FA_*`,
  `BACKUP_*`, `SEO_*`, `PUBLIC_SITE_URL`).
- **System Checkهای تازه:** `emmett_admin.W008` (CSP خاموش)، `W009` (۲FA اجباری خاموش در
  production)، `W010` (کد Search Console)، `W011`/`W012` (پوشهٔ بکاپ)، `W013` (ضعف/نمونه‌بودن
  `SECRET_KEY`).

### وابستگی‌های افزوده (قانون ۶ — توجیه مکتوب)
- `django-otp==1.7.3` و `qrcode==8.2` **بک‌اند** (۲FA و QR SVG بدون CDN/Pillow)؛
  پیش‌تر کد ۲FA بدون ثبت در `requirements.txt` نوشته شده بود که در همین فاز اصلاح شد.
- هیچ وابستگی **فرانت‌اند** جدیدی اضافه نشد (SEO/OG با امکانات خود Next.js).

### اعتبارسنجی (اعداد واقعی)
- بک‌اند: **485 passed** (`pytest -q`, ۷۸ ثانیه) شامل ۲۳ تست امنیت، ۲۲ تست ۲FA، ۹ تست
  بکاپ، ۱۸ تست SEO API، ۲۵ تست ریدایرکت، ۱۸ تست بودجهٔ کوئری و ۵ تست فید؛
  `ruff check .` = All checks passed؛ `mypy apps config` (strict) = بدون خطا در ۲۴۰ فایل؛
  `manage.py check` بدون خطا؛ `makemigrations --check` = بدون تغییر؛ `i18n.py check` سبز.
- فرانت: `npx tsc --noEmit` تمیز، `eslint` صفر مشکل، `vitest run` = ۴۲ تست در ۸ فایل سبز،
  `next build` = ۳۱ صفحه بدون خطا و رندر موفق تصاویر OG دوزبانه (بررسی چشمی/حجمی).
- `ruff format --check` روی فایل‌های همین فاز اجرا و اعمال شد؛ ۱۷ فایل قدیمی خارج از دامنهٔ
  فاز همچنان unformatted است (سیاست از فاز ۵: بدون diff نامرتبط).

### محدودیت‌های محیط/تحویل
- Lighthouse واقعی (هدف ≥۹۵) و Playwright در این محیط قابل اجرا نیستند (نبود Chromium)؛
  معیار جانشین بالا مبنای پذیرش است و اجرای یک‌بارهٔ Lighthouse روی دامنهٔ مقصد در
  چک‌لیست استقرار راهنمای ادمین آمده است.
- `PUBLIC_SITE_URL` تا تعیین دامنهٔ نهایی روی مقدار dev است؛ تنها نقطهٔ تغییر دامنه همان
  env var است (نه کد).

## [فاز ۶ — Admin Customization در سطح SaaS] — 2026-10-05

فاز ۶ بر پایهٔ چهار پاسخ صریح مالک محصول پیاده‌سازی شد: **Jazzmin + لایهٔ RTL اختصاصی**
(`jazzmin_plus_rtl`)، **بدون مدل مالی جدید** (`no_money_model`)، **بدون وضعیت/فیلد جدید و
بدون migration** (`no_migration`) و **`django-import-export`** برای صادرات/واردات
(`django_import_export`). تصمیم‌ها در `ADR-0027` تا `ADR-0030` ثبت شده‌اند.

### افزوده‌شده

- **تم و برند:** `django-jazzmin==3.0.5` + `backend/static/admin_theme/` شامل
  `emmett-admin.css` (توکن‌های `#5b62e0`/`#1fae6e`، کارت KPI، پیل وضعیت، سایدبار)،
  `emmett-rtl.css` (۱۰۶ قاعدهٔ کاملاً اسکوپ‌شده زیر `html[dir="rtl"]`) و
  `emmett-admin.js`؛ فونت وزیرمتن خودمیزبان (۸ فایل `woff2` + مجوز OFL) و دارایی‌های
  برند (`brand/emmett-wordmark.png`, favicon). `core.checks` با شش System Check:
  ترتیب `jazzmin` (E001)، نبود `import_export` (E002)، مسیر قالب (E003)، دارایی استاتیک
  گم‌شده (E004)، تازگی ترجمهٔ کامپایل‌شده (W005)، ارجاع CDN فونت (W006) و
  `PUBLIC_SITE_URL` در حالت `--deploy` (W007).
- **داشبورد:** قالب `templates/admin/index.html` + `apps/core/dashboard.py` با KPI
  (کاربران، درخواست‌های AI، Lead و نرخ تبدیل، دوره/ثبت‌نام، سیگنال‌های فروش بدون مدل مالی،
  خلاصه‌های در انتظار تأیید)، نمودار SVG درون‌خطی ۸ هفته‌ای، قیف فروش، وضعیت محتوا و
  ویجت‌های «اقدامات اخیر» (AuditLog + LogEntry کاربر جاری)؛ کش‌شده با
  `ADMIN_DASHBOARD_CACHE_SECONDS` و سقف کوئری قفل‌شده در تست (۱۷).
- **گردش‌کار و عملیات ادمین:** `apps/core/admin_mixins.py` (`EmmettAdminDefaults`,
  `PublishWorkflowMixin`, `SoftDeleteAdminMixin`, `RecordStateFilter`,
  `ExportFormatsMixin`, `ImportDisabledMixin`, `EmmettImportExportAdmin`,
  `render_status_pill`)، `apps/core/admin_filters.py` (`RelatedPresenceFilter`,
  `TranslationCompletenessFilter`) و بازنویسی ادمین ۱۰ اپ با inline هوشمند،
  autocomplete، `list_editable`، `date_hierarchy` و جست‌وجوی دوزبانه (`title_fa`+`title_en`).
- **کاتالوگ/پرامپت AI در ادمین:** نسخه‌دار با کلید تغییرناپذیر پس از ساخت، ستون
  «نسخهٔ مؤثر»، اکشن بایگانی نسخه‌های قدیمی، approve/reject خلاصه‌ها، revoke اشتراک عمومی
  و ثبت هر تغییر در `AuditLog`.
- **صادرات/واردات:** `django-import-export==4.4.1` با منابع صریح برای هر مدل
  (`apps/<app>/resources.py`)، فرمت‌های CSV/TSV/JSON، واردات دو مرحله‌ای، کلیدهای پایدار
  (slug/order/feature+locale+version/…) و نرمال‌سازی «خالی = None» در `EmmettResource.skip_row`
  برای idempotency واقعی.
- **مستندات:** `docs/admin-guide-fa.md` (راهنمای گام‌به‌گام فارسی پنل)، `ARCHITECTURE.md`
  به‌روزرسانی شد و چهار ADR جدید (`0027` تم/RTL، `0028` داشبورد/گردش‌کار، `0029`
  صادرات/واردات، `0030` ابزار i18n).

### رفع باگ (یافته‌شده با تست‌های ساختاری فاز ۶)

- **اکشن‌های گروهی ۵۰۰ می‌دادند:** اکشن‌های mixin به‌صورت متد bound در `get_actions`
  ثبت می‌شدند، ولی Django در `response_action` آن‌ها را `func(self, request, queryset)`
  صدا می‌زند → همهٔ اکشن‌های انتشار/بازگردانی با `TypeError` می‌شکستند. اصلاح: ثبت
  unbound (`getattr(self.__class__, name)`) + تست رگرسیون POST واقعی روی changelist.
- **نرم‌حذف بدون بازگردانی:** مدل‌های `BaseModel` که mixin بازگردانی نداشتند
  (پیکربندی‌های `ai_engine`، `portfolio.CaseStudy`، `core.Media`) رکورد حذف‌شده را برای همیشه
  از دید پنل پنهان می‌کردند؛ mixin/فیلتر «وضعیت رکورد» اضافه شد.
- **`core.Translation` با `deleted_at`:** این مدل (جدول key-value سبک) برخلاف فرض اولیه
  `BaseModel` نیست؛ اعمال `SoftDeleteAdminMixin`/`RecordStateFilter` روی آن
  `FieldError: Cannot resolve keyword 'deleted_at'` می‌داد و حذف شد.
- **`core.SearchIndexEntry` بدون `resource_class`:** صادرات آن به resource خودکار پکیج
  وابسته بود (ستون‌های بی‌ثبات)؛ `SearchIndexEntryResource` صریح اضافه شد.
- **`list_editable` و ستون وضعیت:** در ادمین‌هایی که وضعیت با ستون رنگی نمایش داده
  می‌شود، فیلد خام `status` از `list_editable` حذف شده است؛ قاعدهٔ جنگو (`admin.E123`)
  اجازهٔ ویرایش ستونی را نمی‌دهد که در `list_display` نیست. صحت همهٔ ادمین‌ها با
  `manage.py check` (بدون خطا) و تست‌های فاز ۶ تأیید شده است.

### سخت‌سازی

- `IMPORT_EXPORT_USE_TRANSACTIONS=True`، escape فرمول/کاراکتر غیرمجاز در CSV و
  `IMPORT_EXPORT_SKIP_ADMIN_LOG=False` (واردات در `admin.LogEntry` ثبت می‌شود).
  علاوه بر آن، چون پکیج برای **صادرات** هیچ ردی حسابرسی نمی‌سازد،
  `EmmettImportExportAdmin.export_action` هر صادرات فایل را در `AuditLog` با تعداد
  ردیف‌ها، فرمت و نام فایل ثبت می‌کند (`<app>.<Model>.exported`).
- مجوز صادرات/واردات روی `view`/`add` جنگو؛ دادهٔ کاربر/لید/لاگ فقط‌صادرات.
- اکشن‌ها مجوز `change` می‌خواهند و هر اقدام گروهی (انتشار/بایگانی/بازگردانی/ترجمه)
  در `AuditLog` ثبت می‌شود.

### اعتبارسنجی فاز ۶

- بک‌اند: **۳۶۵ تست passed** (۲۵۷ تست قبلی + ۱۰۸ تست جدید فاز ۶)؛ `ruff check .`
  بدون خطا؛ `mypy apps config` بدون خطا (۲۲۲ فایل، strict)؛
  `manage.py check` بدون خطا؛ `makemigrations --check --dry-run` → «No changes detected».
- تست‌های فاز ۶: `test_admin_dashboard.py` ۱۵، `test_admin_workflow.py` ۱۴،
  `test_admin_exchange.py` ۱۸، `test_admin_theme.py` ۱۳، `test_admin_checks.py` ۱۲،
  `test_i18n_tooling.py` ۱۵، `test_admin_search_filters.py` ۸، `test_admin_surface.py` ۱۳.
- i18n: `python scripts/i18n.py check` سبز؛ **۳۹۸ پیام**، فارسی **۱۰۰٪** ترجمه‌شده؛
  `.mo` هر دو زبان کامپایل و در Git نگه‌داری می‌شود؛ متن رابط ادمین در زبان `en`
  همان متن منبع (انگلیسی) برمی‌گرداند (طراحی ADR-0030).
- `manage.py check --deploy` با تنظیمات production فقط دو هشدار مورد انتظار می‌دهد:
  `W007` (چون `PUBLIC_SITE_URL` در محیط تست، مقدار پیش‌فرض است) و `security.W009`
  (کلید موقت تست)؛ هیچ خطای دیگری وجود ندارد.

### محدودیت‌های محیط/تحویل

- بررسی بصری مرورگری (اسکرول افقی صفر در همهٔ صفحات، Lighthouse) در sandbox ممکن
  نیست؛ به‌جای آن، درستی RTL با تست‌های ساختاری روی CSS/قالب (اسکوپ‌بودن همهٔ ۱۰۶ قاعده،
  بارگذاری `admin/css/rtl.css` فقط در فارسی، نبود CDN) و SMOKE دستی روی پیش‌نمایش
  زندهٔ پنل بررسی شد.
- هیچ مدل مالی و هیچ وضعیت `review` اضافه نشده است (تصمیم صریح مالک محصول)؛ «فروش»
  در داشبورد با سیگنال‌های Lead/ثبت‌نام نمایش داده می‌شود و به بخش لیدها لینک دارد.

## [فاز ۵ — موتور AI و مشاور ایده‌پرداز] — 2026-10-05

فاز ۵ بر پایهٔ Plan و `ADR-0026` تأییدشده پیاده‌سازی شد؛ جزئیات طراحی و
تصمیم‌های محصولی در ADR، `ARCHITECTURE.md`، `README.md` و راهنمای هر دو بخش
ثبت شده‌اند.

### افزوده‌شده

- اپ مرکزی `backend/apps/ai_engine`: adapter عمومی OpenAI-compatible با
  `requests` موجود، Catalog/Prompt/Guardrailهای DB، pipeline مشاور با حداکثر
  سه ایده، نتیجهٔ share عمومی با token تصادفیِ hash‌شده و قابلیت revoke،
  تخمین‌گر deterministic بدون هزینهٔ عددی، audit/cache/rate limit، و خلاصه‌ساز
  مقالات منتشرشده که Draft می‌سازد تا ادمین آن را تأیید کند.
- migration یکپارچه‌سازی `Contact` با Catalogهای DB، با حفظ stable keyهای
  فعلی؛ اتصال Lead به پیشنهاد و ایدهٔ انتخاب‌شده؛ UI ترجمه‌شدهٔ `/advisor`،
  `/advisor/results/[token]` و `/estimate` در فارسی/انگلیسی.
- خلاصهٔ AI فقط پس از تأیید ادمین از API مقاله برمی‌گردد؛ تغییر محتوای اصلی
  خلاصهٔ قبلی را stale می‌کند. دستورهای seed و purge یک‌سالهٔ audit نیز اضافه‌اند.

### سخت‌سازی

- محافظت CSRF برای POSTهای عمومی Contact، Newsletter و AI؛ پاسخ‌های Contact،
  Newsletter، estimator و AI Lead با `Cache-Control: no-store`.
- CSP با nonce یکتا در `src/proxy.ts` و dynamic SSR در layout؛ HSTS فقط در
  production. `frame-ancestors` عمداً تا تعیین دامنهٔ production تنظیم نشده
  تا preview داخل iframe قابل استفاده بماند.
- ورودی کاربر به provider محدود به کلیدهای Catalog فعال است؛ متن آزاد و اطلاعات
  تماس وارد prompt/audit نمی‌شود. Audit فاقد IP و user-agent است؛ خطای provider
  و خروجی ردشده به‌شکل کنترل‌شده مدیریت می‌شوند.

### اعتبارسنجی فاز ۵

- بک‌اند: **257 passed**؛ Ruff check، mypy، `manage.py check`، migration check
  و OpenAPI `--validate --fail-on-warn` موفق.
- فرانت‌اند: lint و TypeScript موفق؛ Vitest **19 passed در 4 فایل**؛ build
  production موفق و routeهای locale به‌شکل dynamic SSR گزارش شدند.
- smoke test روی build واقعی: CSP/nonce روی script، هدرهای امنیتی و تخمین از
  مسیر same-origin proxy با CSRF تأیید شدند. provider واقعی عمداً فعال نشد.
- `ruff format --check .` هنوز 19 فایل قدیمیِ خارج از scope فاز ۵ را
  unformatted گزارش می‌کند؛ برای پرهیز از diff نامرتبط، format سراسری اعمال نشد.

### محدودیت‌های محیط/تحویل

- AI به‌صورت پیش‌فرض خاموش است؛ اتصال provider واقعی نیازمند تنظیم امن env در
  staging/production است. هیچ کلیدی در Git یا گفتگو قرار نگرفت.
- E2E واقعی Playwright به‌دلیل نبود browser binary در sandbox اجرا نشد؛
  `frontend/e2e/README.md` پیش‌نیاز و محدودیت محیط را ثبت می‌کند.
- امتیاز Lighthouse (هدف پروژه ≥95) در این محیط اندازه‌گیری نشد؛ باید روی
  دامنه و زیرساخت مقصد بررسی شود. تعیین `frame-ancestors` نیز تا مشخص‌شدن
  دامنهٔ رسمی production باز می‌ماند.

## [فاز ۴ — بازبینی و سخت‌سازی پیش از PR] — 2026-10-04

مرور کامل فازهای ۰ تا ۴ (کد، ADRها، تست‌ها) پیش از باز شدن اولین Pull
Request، برای اطمینان از اینکه چیزی از این فازها نیمه‌کاره باقی نمانده.
برخلاف فازهای قبل که فیچر جدید اضافه می‌کردند، این بخش **شکاف‌های کشف‌شده
بین مستندات/ADR و کد واقعی** را می‌بندد.

### رفع باگ (یافته‌های امنیتی/صحت)

- **Rate limiting عملاً هیچ‌وقت کار نمی‌کرد (باگ بحرانی):** زیرکلاس‌های
  `ScopedRateThrottle` (`ContactFormRateThrottle`, `AuthRateThrottle`,
  `AIEngineRateThrottle`) مقدار `scope` را به‌صورت attribute کلاس ست
  می‌کردند، اما DRF مقدار واقعی scope را از `view.throttle_scope` در زمان
  اجرا می‌خواند — چون هیچ viewای این attribute را نداشت، `allow_request`
  همیشه `True` برمی‌گرداند و فرم تماس/ورود/ثبت‌نام **هرگز محدود نمی‌شدند**.
  رفع شد با یک کلاس پایهٔ مشترک (`apps/core/throttling.py`) که
  `view.throttle_scope` را از `scope` کلاس خودش ست می‌کند؛ با تست سطح HTTP
  (نه فقط assertion روی attribute) دوباره اعتبارسنجی شد. جزئیات کامل در
  به‌روزرسانی `ADR-0006`.
- عضویت خبرنامه (`NewsletterSubscribeView`) هیچ throttle ای نداشت، برخلاف
  جدول صریح `ADR-0006` (۳/روز/IP)؛ `NewsletterRateThrottle` اضافه و اعمال شد.
- `AuditLog`/`log_action` (`ADR-0013`) از فاز ۲ وجود داشتند اما **هیچ کد
  واقعی آن‌ها را صدا نمی‌زد** — هیچ رویداد حساسی هرگز ثبت نمی‌شد. اکنون
  متصل‌اند به: حذف/بازیابی هر رکورد (`BaseModel.delete`/`restore`، عمومی
  برای همهٔ مدل‌ها)، تغییر نقش کاربر (`pre_save` سیگنال روی `User`)، ورود
  ناموفق/موفق، خروج، ثبت‌نام، و تعدیل کامنت در ادمین.
- اعتبارسنجی آپلود `core.Media` (`ADR-0005`: whitelist پسوند، بررسی سرنام
  فایل، سقف حجم) هیچ‌وقت پیاده‌سازی نشده بود؛ `apps/core/validators.py`
  اضافه و در `Media.clean()` متصل شد؛ `backend/deploy/media.htaccess.example`
  برای غیرفعال‌سازی اجرای اسکریپت در دایرکتوری `media/` روی production اضافه شد.
- مستندات خودکار OpenAPI (`drf-spectacular`) روی ~۱۲ از ~۲۵ endpoint سفارشی
  (`LoginView`, `RegisterView`, `LogoutView`, `MeView`, `CsrfTokenView`,
  `FavoriteCreateView`, `FavoriteDeleteView`, `ContactCreateView`,
  `NewsletterSubscribeView`, `EnrollmentCreateView`, `HealthCheckView`,
  `GlobalSearchView`) و ۲ فیلد محاسبه‌شده (`BlogPostDetailSerializer.get_comments`/`get_related_posts`,
  `ProjectDetailSerializer.get_case_study`) warning/error تولید می‌کرد
  (`python manage.py spectacular --fail-on-warn` با ۵۱ خطا/هشدار fail
  می‌شد). همهٔ این‌ها با `@extend_schema`/`@extend_schema_field` یا guard
  کردن `get_queryset` در برابر `swagger_fake_view` رفع شدند؛ اسکیما اکنون
  کاملاً تمیز تولید می‌شود (۰ warning، ۰ error).
- وابستگی بلااستفادهٔ `django-ratelimit` (هیچ‌وقت import نشده بود) از
  `requirements.txt` حذف شد.

### افزوده‌شده

- `backend/README.md` (قبلاً وجود نداشت): راه‌اندازی محلی، نقشهٔ اپ‌ها،
  مستندات API، تست/کیفیت کد، بخش امنیت/حسابرسی، محدودیت‌های شناخته‌شده.
- هدرهای HTTP سخت‌سازی پایه در `frontend/next.config.ts`
  (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`).
  عمداً `X-Frame-Options`/`frame-ancestors` اضافه **نشد** چون محیط‌های
  پیش‌نمایش توسعه‌ای (sandbox) سایت را داخل iframe از origin دیگر نشان
  می‌دهند؛ این تصمیم به فاز Deployment با دامنهٔ واقعی موکول شد.
- ۳۰+ تست جدید backend برای رفتارهای بالا (`apps/core/tests/test_throttling.py`,
  `test_validators.py`, گسترش `test_models.py`/`test_views.py`,
  `apps/blog/tests/test_admin.py`).

### مستندسازی/تصمیمات صریح

- **`ai_engine` رسماً به فاز ۵ موکول شد** (با تأیید صریح مالک محصول):
  طراحی معماری (`ARCHITECTURE.md` §۳.۱۰, `ADR-0009`) دست‌نخورده می‌ماند
  اما implementation آن یک «کار نیمه‌کاره از فاز ۰ تا ۴» محسوب نمی‌شود —
  نیاز به تصمیمات محصولی جدید (provider AI، کلید API، enum های دقیق) دارد
  که باید در یک نشست Discovery→Plan→ADR→Implementation مجزا گرفته شوند.
  جزئیات در به‌روزرسانی انتهای `DISCOVERY.md` و ابتدای `ADR-0009`.
- **CI/CD (GitHub Actions) عمداً اضافه نشد** (با تأیید صریح مالک محصول):
  به فاز جداگانهٔ DevOps/Deployment موکول شد؛ تا آن زمان دستورات
  `pytest`/`ruff`/`mypy`/`npm run lint`/`npx tsc`/`npm run test` باید
  دستی قبل از هر PR اجرا شوند (مستند در `backend/README.md`/ریشهٔ همین فایل).
- بخش قدیمی «Gap شناخته‌شده» در `README.md` ریشه دربارهٔ
  `apps/core/utils/dates.py`/`numerals.py` حذف شد — این فایل‌ها از فاز
  قبل موجودند؛ آن یادداشت منسوخ بود.

### شناخته‌شده/باز (به‌صورت صریح پذیرفته‌شده، نه فراموش‌شده)

- اسکن ویروس آپلود با `clamd` (`ADR-0005`) پیاده‌سازی نشده؛ وابسته به
  دسترسی سرویس روی هاست production، به فاز Deployment موکول شد.
- حذف/آپدیت دسته‌ای مستقیم روی `QuerySet` (نه `instance.delete()`) در
  AuditLog ثبت نمی‌شود؛ فقط فراخوانی تکی پوشش داده شده (دلیل: حفظ کارایی
  SQL تکی برای bulk operations).
- sanitize محتوای SVG آپلودی (طبق whitelist اصلی `ADR-0005`) هنوز
  پیاده‌سازی نشده؛ اعتبارسنجی فعلی فقط پسوند/حجم را برای svg بررسی می‌کند
  (بدون بررسی سرنام باینری، چون svg متن XML است).
- محیط این sandbox هنوز اجازهٔ دانلود باینری مرورگر Playwright را نمی‌دهد
  (`cdn.playwright.dev` در دسترس نیست)؛ همان محدودیت مستندشده در
  `frontend/e2e/README.md` از فاز قبل، بدون تغییر.

## [فاز ۴] — Content Apps، Enrollment، Seed Data و صفحات مصرف‌کنندهٔ API — 2026-10-04

### افزوده‌شده — بک‌اند

- اپ `apps.academy.Enrollment`: مدل (کاربر+دوره+وضعیت active/completed/cancelled+درصد پیشرفت، با محدودیت یکتایی کاربر/دوره)، سریالایزرهای `EnrollmentSerializer`/`EnrollmentCreateSerializer`، `EnrollmentListView`/`EnrollmentCreateView` (`IsAuthenticated`)، ثبت در ادمین، ۱۰ تست (مدل+API+مجوز+idempotency ثبت‌نام تکراری).
- دستور مدیریتی `python manage.py seed_demo_data` (در `apps/core/management/commands/`): ایدمپوتنت، می‌سازد: ۳ کاربر نقش‌دار (`admin@emmett.dev`/`author@emmett.dev`/`client@emmett.dev`)، Category/Tag دوزبانه، TeamMember×۴، Testimonial×۳، Service×۴، Project×۳ (یکی `is_product`) + CaseStudy، Instructor×۲، Course×۳ با Lesson×۳ هرکدام + یک Enrollment نمونه، BlogPost×۳ با Comment نمونه، یک مشترک خبرنامه، به‌روزرسانی `SiteSettings`.

### افزوده‌شده — فرانت‌اند (مصرف‌کنندهٔ API)

- لایهٔ API تایپ‌شده در `frontend/src/lib/api/`: `types.ts` (تمام shapeهای پاسخ سریالایزرهای بک‌اند)، `server.ts` (fetch مستقیم به `INTERNAL_API_URL` برای Server Components، با `revalidate: 60`)، `client.ts` (fetch مسیر نسبی `/api/v1/...` برای Client Components، شامل `ensureCsrfCookie`/`ApiError`/توابع auth، favorites، enrollment، contact، newsletter، comment، search)، `config.ts`.
- Route Handler `frontend/src/app/api/[...path]/route.ts`: پراکسی سمت سرور تمام متدهای HTTP به بک‌اند Django، با حفظ دقیق مسیر (شامل اسلش پایانی) و همهٔ هدرهای `Set-Cookie` (کوکی‌های چندگانهٔ csrftoken/sessionid).
- صفحات جدید (هر دو locale): `/services`+`/services/[slug]`، `/projects`+`/projects/[slug]` (شامل رندر Case Study/metrics)، `/products` (فیلتر `is_product=true` روی همان API)، `/academy`+`/academy/[slug]` (+ `EnrollButton` با تشخیص وضعیت مهمان/واردشده/ثبت‌نام‌شده)، `/blog`+`/blog/[slug]` (+ فهرست مطالب، مقالات مرتبط، `CommentForm`)، `/about` (تیم + نظرات مشتریان)، `/contact` (`ContactForm` + `NewsletterForm`)، `/search` (جست‌وجوی سراسری با `SearchBox` کلاینتی)، `/profile` (`ProfileView`: تب ورود/ثبت‌نام، دوره‌های من، علاقه‌مندی‌ها، خروج).
- صفحات خطای سفارشی: `[locale]/not-found.tsx` و `[locale]/error.tsx` (داخل layout اصلی، دوزبانه از next-intl)، `src/app/not-found.tsx` و `global-error.tsx` (fallback استاتیک دوزبانهٔ بیرون از `[locale]`، برای حالت نادر خطای خود root layout).
- کلاس CSS سراسری `.markdown-content` در `globals.css` برای رندر HTML تولیدشده از Markdown بک‌اند (جایگزین پلاگین `@tailwindcss/typography` تا وابستگی جدید اضافه نشود).
- namespaceهای جدید پیام در `messages/{fa,en}.json`: `services`, `projects`, `academy`, `blog`, `team`, `contact`, `search`, `profile`, `errors`, `pagination` (هر دو زبان کاملاً متقارن).
- تست‌های E2E با Playwright (`frontend/e2e/`, طبق `ADR-0023`): ۲۰ تست در ۵ فایل — ناوبری/فهرست/جزئیات تمام محتوا، حالت مهمان، ۴۰۴، جست‌وجو، فرم تماس/خبرنامه، جریان کامل ثبت‌نام→ورود→ثبت‌نام دوره→کامنت→خروج، و بررسی دوزبانهٔ dir/عنوان/ناوبری (دو پروژهٔ Playwright `fa-locale`/`en`). `frontend/e2e/README.md` مستندساز پیش‌نیازها.

### رفع باگ

- `seed_demo_data`: دو باگ `FieldError` (`full_name_fa`/`author_company_fa`/`name_fa` روی فیلدهای ساده‌ای که ترجمه نشده‌اند) با تغییر به نام فیلد واقعی (`full_name=`, `author_name=`, `author_company=`, `name=`) رفع شد؛ فقط فیلدهای واقعاً ترجمه‌شده (`role_title_fa/en`, `quote_fa/en`, `title_fa/en`) دست‌نخورده ماندند.
- **باگ بحرانی پراکسی API:** `rewrites()` اولیهٔ `next.config.ts` اسلش پایانی مسیرهای `/api/v1/...` را پیش از فوروارد به بک‌اند حذف می‌کرد؛ چون تمام URLConfهای Django با اسلش پایانی تعریف شده‌اند، جنگو با `APPEND_SLASH` یک ۳۰۱/۳۰۸ برمی‌گرداند که روی متدهای POST/PATCH عملاً درخواست را می‌شکست (ری‌دایرکت خودکار مرورگر POST را به GET تبدیل می‌کند). با جایگزینی کامل rewrites با Route Handler دستی (`src/app/api/[...path]/route.ts`) که از `request.nextUrl.pathname` خام استفاده می‌کند، رفع شد؛ با تست کامل e2e سطح HTTP (ثبت‌نام→ورود→فرم تماس→ثبت‌نام دوره→خروج، هرکدام از طریق پراکسی) تأیید شد.
- تشخیص «کاربر مهمان» در `EnrollButton`/`CommentForm` فرض اشتباه کد وضعیت ۴۰۱ برای درخواست بدون احراز هویت داشت؛ چون DRF با `SessionAuthentication` تنها (بدون auth scheme دارای `WWW-Authenticate`) همیشه ۴۰۳ برمی‌گرداند نه ۴۰۱، هر دو کد به‌عنوان «مهمان» پذیرفته شدند.
- دو خطای E501 (خط طولانی) در `seed_demo_data.py` با شکستن رشته‌های f-string رفع شد.

### تصمیمات کلیدی

- معماری اتصال frontend↔backend: Server Components مستقیماً `INTERNAL_API_URL` را صدا می‌زنند (سرور-به-سرور)؛ Client Components فقط مسیر نسبی `/api/v1/...` (پراکسی‌شده) — هم با محدودیت sandbox (مرورگر نباید مستقیم به بک‌اند داخلی وصل شود) و هم با نیاز به کوکی سشن هم‌مبدا سازگار است.
- `/library` در ناوبری (`SiteHeader`) عمداً به `/blog` map شد (نه مسیر مجزای `/library`)، چون `url_path` واقعی بک‌اند برای بلاگ همیشه `/blog/{slug}` است؛ برچسب نمایشی «کتابخانه» حفظ شد.
- نتایج جست‌وجوی سراسری (`url_path` از بک‌اند، از قبل دارای پیشوند locale) با `next/link` خام رندر می‌شوند، نه `Link` locale-aware از `i18n/navigation.ts`، تا پیشوند locale دوبار اضافه نشود.

### شناخته‌شده/باز

- **محدودیت sandbox توسعه:** دامنهٔ `cdn.playwright.dev` از شبکهٔ این sandbox در دسترس نبود (TLS reset)، پس باینری مرورگر Chromium قابل‌نصب نشد و `npm run test:e2e` در این محیط واقعاً اجرا نشد. سوییت با `npx playwright test --list` (۲۰ تست، بدون خطای TS/ESLint) اعتبارسنجی ساختاری شد؛ تمام جریان‌های کاربری معادل آن به‌صورت دستی در سطح HTTP (`curl` از طریق پراکسی Next.js، هم روی `next dev` هم روی build تولیدی `next build && next start`) تأیید شدند. در محیطی با دسترسی شبکهٔ کامل (مثل CI)، باید فقط `npx playwright install chromium` اجرا و سپس `npm run test:e2e` بدون تغییر دیگری کار کند.
- گالری تصاویر پروژه/عکس profile/کاور بلاگ با `<img>` خام رندر می‌شوند (نه `next/image`)، چون دامنهٔ رسانهٔ بک‌اند (media storage) در این فاز پویا/نامشخص است؛ بهینه‌سازی تصویر (lazy loading native مرورگر فعال است اما بدون resize/format negotiation خودکار Next) می‌تواند در فاز بعد با پیکربندی `images.remotePatterns` اضافه شود.
- صفحهٔ `/profile` فعلاً صفحه‌بندی (pagination) برای علاقه‌مندی‌ها/دوره‌های من ندارد (فرض: تعداد کم در این فاز)؛ باید در صورت رشد داده اضافه شود.

## [فاز ۳] — Frontend Foundation — 2026-10-04

### افزوده‌شده

- پوشهٔ `frontend/` جدید، هم‌تراز با `backend/`: اسکلت کامل Next.js 16 (App Router، Turbopack) + TypeScript strict + Tailwind v4 (CSS-first با `@theme inline`).
- اسکلت قدیمی React/Vite ریشهٔ ریپو به `legacy-frontend-reference/` منتقل شد (فقط مرجع بصری، نه کد زنده — ر.ک. `legacy-frontend-reference/README.md`).
- سیستم مسیریابی دوزبانه با `next-intl`: فارسی پیش‌فرض بدون پیشوند (`/`)، انگلیسی با پیشوند (`/en`)؛ `src/proxy.ts` (قرارداد جدید Next.js 16، جایگزین `middleware.ts`)، `src/i18n/{routing,navigation,request}.ts`، `messages/{fa,en}.json` (۶۰ کلید، کاملاً متقارن، بدون کم‌وکسری).
- توکن‌های طراحی کامل در `src/app/globals.css`: رنگ (روشن/تاریک + لهجه‌های برند + سطوح ادیتوریال مستقل از تم)، شعاع، سایه (شامل دو glow سفارشی CTA)، موشن (duration/easing)، بریک‌پوینت‌های برند — استخراج‌شده از `legacy-frontend-reference/default_shadcn_theme.css` + اسناد `pasted_text/*.md` (بدون Figma واقعی).
- فونت‌های خوداستقرار (self-hosted) با `@fontsource/{vazirmatn,inter,jetbrains-mono}`: فارسی=Vazirmatn، لاتین=Inter، مونو=JetBrains Mono؛ بدون هیچ وابستگی build-time به شبکهٔ خارجی.
- لایهٔ بومی‌سازی تاریخ/عدد: `src/lib/format/date.ts` (`dayjs`+`jalaliday`، تقویم جلالی/میلادی)، `src/lib/format/number.ts` (`Intl.NumberFormat` بومی، ارقام فارسی/لاتین + `toLocaleDigits`).
- Atoms: `Button` (۴ variant × ۳ size، حالت loading/disabled)، `Input`، `Badge` (۴ variant)، `Icon` (wrapper دسترس‌پذیر دور lucide-react)، `Avatar` (`@radix-ui/react-avatar`)، `Skeleton`.
- Molecules: `Card` (+ CardMedia/Header/Title/Description/Content/Footer)، `FormGroup` (سیم‌کشی صحیح `aria-describedby` بین label/hint/error)، `Breadcrumb` (جهت پیکان پویا RTL/LTR)، `FadeIn` (wrapper روی `motion/react`، احترام به `prefers-reduced-motion`)، `ThemeToggle` (hydration-safe با `useSyncExternalStore`)، `LocaleSwitcher`.
- Organisms: `SiteHeader` (sticky، شفاف→solid بعد ۸۰px اسکرول، منوی موبایل)، `SiteFooter`، `Hero` (پس‌زمینهٔ Obsidian ادیتوریال مستقل از تم کاربر).
- `app/[locale]/layout.tsx` (root layout واقعی با `generateStaticParams`/`setRequestLocale`/`lang`+`dir` پویا)، `app/[locale]/page.tsx` (صفحهٔ اصلی)، `app/[locale]/design-system/page.tsx` (صفحهٔ نمونهٔ کامل Design System، جایگزین Storybook — هر دو locale: `/design-system`, `/en/design-system`).
- پیکربندی `Vitest` + `@testing-library/react` + `jsdom`؛ ۱۹ تست سبز: منطق خالص (`formatDate`/`formatToday`/`formatNumber`/`toLocaleDigits`) و کامپوننت (`Button`, `FormGroup` — شامل بررسی `aria-describedby`/`aria-required`).
- فلگ‌های TS strict اضافه در `tsconfig.json`: `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
- پنج ADR جدید: `0016` (معماری Next.js/i18n/proxy.ts)، `0017` (توکن‌های طراحی بدون Figma)، `0018` (انتخاب فونت + self-hosting)، `0019` (بومی‌سازی تاریخ/عدد فرانت‌اند)، `0020` (قرارداد نام‌گذاری CSS var + صفحهٔ design-system به‌جای Storybook).

### تصمیمات کلیدی

- Alpine.js/HTMX به‌طور کامل از scope فاز ۳ حذف شدند (ناسازگار با Next.js؛ تصمیم صریح مالک محصول: `keep_nextjs`).
- کد فرانت‌اند به `frontend/` منتقل شد (نه ریشهٔ ریپو)، طبق پلن مونوریپوی `ADR-0001`.
- اسکلت React/Vite قدیمی فقط مرجع بصری ماند؛ هیچ کامپوننت آن مستقیماً پورت نشد.
- `next/font/google` کنار گذاشته شد به نفع `@fontsource` + `@import` مستقیم، چون build در sandbox (و بالقوه هر محیط با دسترسی شبکهٔ محدود به `fonts.googleapis.com`) شکست می‌خورد.
- Storybook عمداً انتخاب نشد؛ یک صفحهٔ Next.js واقعی (`/design-system`) جایگزین آن شد تا از محیط رندر واقعی (فونت/توکن/i18n/تم) استفاده کند، نه یک sandbox مجزا.

### رفع باگ

- دو باگ تکراری self-reference در `@theme inline` (شعاع/سایه، سپس فونت مونو) کشف و رفع شدند؛ قرارداد نام‌گذاری `-value-`/`-raw` برای جلوگیری از تکرار در فازهای بعد مستند شد (`ADR-0020`).
- باگ دسترس‌پذیری در `FormGroup`: وقتی هم `hint` و هم `error` ست می‌شدند، `aria-describedby` به `id` یک `<p>` اشاره می‌کرد که اصلاً رندر نمی‌شد (نقض WCAG)؛ با تست کامپوننت کشف و رفع شد.
- کلاس‌های رنگ ساخته‌شده با template literal پویا (`` `bg-${token}` ``) در صفحهٔ design-system جایگزین نام‌های literal شدند، چون اسکنر استاتیک Tailwind قادر به تشخیص کلاس‌های تولیدشدهٔ runtime نیست.

### شناخته‌شده/باز

- **Gap بک‌اند:** `apps/core/utils/dates.py`/`numerals.py` (بومی‌سازی تاریخ/عدد سمت Django، طبق `ADR-0004`) هنوز در فاز ۲ ساخته نشده؛ `jdatetime==6.1.0` در `requirements.txt` پین شده اما بلااستفاده است.
- فونت‌های self-hosted preload دستی (`<link rel="preload">`) ندارند (برخلاف بهینه‌سازی خودکار `next/font`)؛ در صورت نیاز باید در فاز Performance/SEO اضافه شود.
- منوی موبایل `SiteHeader` بدون focus-trap کامل است (فقط `aria-expanded`/`aria-controls`)؛ قابل ارتقا با Radix `Dialog` در فازهای بعد.
- `LocaleSwitcher` فعلاً پارامترهای مسیر پویا (`[slug]`) را منتقل نمی‌کند، چون فاز ۳ هیچ مسیر پویایی ندارد؛ باید با افزودن اولین مسیر پویا به‌روزرسانی شود.

## [فاز ۲] — Backend Foundation — 2026-10-04

### افزوده‌شده

- اسکلت کامل پروژهٔ Django در `backend/`: تنظیمات سه‌لایه (`config/settings/base.py`, `dev.py`, `production.py`)، `urls.py`/`wsgi.py`/`asgi.py`/`manage.py`.
- Custom User Model (`apps/accounts/models.py`) با `email` به‌جای `username`، نقش‌های `admin/editor/student/client`، `phone`/`is_phone_verified` (آماده برای OTP آینده)، `public_id` (UUID).
- `BaseModel` مشترک در `apps/core/models.py`: `created_at`, `updated_at`, `is_active`, soft delete (`delete(hard=False)`/`restore()`) + `BaseManager`/`AllObjectsManager`/`BaseQuerySet` اختصاصی.
- مدل `AuditLog` (با `GenericForeignKey`) و تابع کمکی `log_action(...)` برای ثبت متمرکز رویدادهای حساس (قانون ۱۶).
- لایهٔ DRF مشترک: `StandardResultsSetPagination` (envelope یکنواخت)، `custom_exception_handler` (envelope خطای یکنواخت + لاگ ساختاریافته)، سه کلاس throttle (`contact_form`, `ai_engine`, `auth`).
- مستندسازی خودکار API با `drf-spectacular` (`/api/v1/schema/`, `/swagger-ui/`, `/redoc/`).
- `HealthCheckView` در `/api/v1/health/` (بررسی دیتابیس + کش، عمومی/بدون auth).
- لاگ ساختاریافته با `structlog` + `django-structlog` (JSON در production، کنسول خوانا در dev، `request_id` خودکار).
- پیکربندی ابزار: `backend/pyproject.toml` (mypy strict + ruff)، `backend/pytest.ini` (pytest-django).
- تست‌های پایه (۲۸ تست، پوشش ۹۶٪ روی `apps/core`/`apps/accounts`) با `pytest-django` + `factory-boy` (`UserFactory`).
- اولین migrationها (`apps/accounts/migrations/0001_initial.py`, `apps/core/migrations/0001_initial.py`) تولید و روی SQLite اعتبارسنجی شدند.
- `.gitignore` ریشهٔ ریپو (پوشش فرانت‌اند و بک‌اند: `node_modules/`, `dist/`, `backend/.venv/`, `backend/db.sqlite3`, `backend/staticfiles/`, `.env`، کش‌های ابزار).
- پنج ADR جدید: `0011` (Custom User + Session/CSRF auth)، `0012` (BaseModel/soft delete)، `0013` (طراحی AuditLog)، `0014` (لایهٔ DRF)، `0015` (لاگ ساختاریافته + ابزار تست/type-checking).

### تصمیمات کلیدی

- نسخهٔ هدف: **Python 3.11 + Django 5.2 LTS**.
- احراز هویت API: **Session + CSRF** استاندارد Django (نه JWT) — نهایی‌کنندهٔ ADR-0007.
- درایور MySQL: **PyMySQL** (خالص پایتون، بدون کامپایل C).
- `mypy==2.3.0` پین شد (نه `2.4.0`) به‌خاطر تداخل نسخه با `django-stubs[compatible-mypy]==6.1.1`.

### شناخته‌شده/باز

- تابع `log_action` فعلاً داخل `apps/core/models.py` است، نه در `apps/core/services.py` جداگانه (ر.ک. ADR-0013) — در صورت افزودن منطق سرویس‌محور دیگر به `core`، باید منتقل شود.

## [فاز ۱] — Discovery & Architecture

### افزوده‌شده

- `DISCOVERY.md`، `ARCHITECTURE.md`، و ADRهای `0001` تا `0010` (معماری کلی، مرزبندی اپ‌های Django، i18n، تاریخ/اعداد، ذخیره‌سازی رسانه، کش/rate-limit، احراز هویت (بحث اولیه)، پایپ‌لاین CRM لیدها، معماری داده موتور AI، مدیریت وابستگی).
