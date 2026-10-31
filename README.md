# وب‌سایت گروه توسعه نرم‌افزار امیت (Emmett Software Development Group)

> **English README:** [`README.en.md`](./README.en.md)  
> **مستندات فنی یکپارچه (فارسی — تک‌فایلی):** [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md)  
> **Unified Technical Documentation (English — Single File):** [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md)

این مخزن یک **مونو-ریپو (Monorepo)** شامل فرانت‌اند **Next.js 16 (SSR)** در پوشهٔ `frontend/` و بک‌اند **Django 5.2 + DRF** در پوشهٔ `backend/` برای وب‌سایت دوزبانه (فارسی/انگلیسی) گروه توسعه نرم‌افزار **امیت** است.

---

## فهرست سریع مستندات

| سند | توضیح |
|---|---|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | **راهنمای عملیاتی استقرار روی cPanel (فاز ۹):** راهنمای گام‌به‌گام دامنهٔ واحد، اسکریپت‌های `deploy_backend.sh`، `deploy_frontend.sh`، `restore_backup.sh`، متغیرهای محیطی و چک‌لیست Go-Live |
| [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md) | **مرجع فنی جامع در یک فایل (فارسی):** معماری، خلاصهٔ همهٔ ADRها، مستندات کامل API، راهنمای ادمین، راهنمای استقرار روی cPanel و پایپ‌لاین CI/CD |
| [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md) | **Unified Single-File Technical Documentation (English):** Architecture, a digest of every ADR, Full API Reference, Admin Guide, cPanel Deployment Guide, and CI/CD |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | معماری سیستم، نمودار ERD و تصمیمات معماری فاز ۱ |
| [`docs/adr/README.md`](./docs/adr/README.md) | **فهرست کامل و معتبر همهٔ ADRها** — منبع یکتای «کدام ADR وجود دارد»، به‌همراه ارجاع‌های مردهٔ شناخته‌شده و یادداشت‌های اصلاحی |
| [`docs/admin-guide-fa.md`](./docs/admin-guide-fa.md) | راهنمای تفصیلی پنل ادمین سطح SaaS، داشبورد KPI، گردش‌کار انتشار، 2FA و بکاپ |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | راهنمای مشارکت، جدولِ کاملِ ۲۰ قانون سخت‌گیرانه (بازسازی‌شده از مأخذِ ADRها)، فرمت Conventional Commits، چک‌لیست PR و گیت‌های کیفیت |
| [`CHANGELOG.md`](./CHANGELOG.md) | تاریخچهٔ کامل تغییرات پروژه در قالب Conventional Commits |

---

## ویژگی‌های کلیدی پلتفرم

1. **معماری دوزبانهٔ بومی (فارسی پیش‌فرض در `/` و انگلیسی در `/en`):**
   - سیستم سه‌لایهٔ ترجمه (`gettext` + `django-modeltranslation` + جدول `core.Translation` + `next-intl`).
   - تقویم شمسی (`jdatetime` / `jalaliday`) و ارقام فارسی در زبان فارسی؛ تقویم میلادی و ارقام لاتین در انگلیسی.
   - مدیریت جهت‌چینش (`RTL`/`LTR`) در سطح کامپوننت و کلاس‌های منطقی CSS بدون هک.
2. **سیستم طراحی Emerald / Obsidian و دسترسی‌پذیری WCAG AA:**
   - پیاده‌سازی کامل اتم‌ها، مولکول‌ها و ارگانیسم‌ها با پشتیبانی از تم تیره/روشن و فونت‌های خودمیزبان (`Vazirmatn`, `Inter`, `JetBrains Mono`).
3. **پرتال محتوایی، آکادمی، محصولات و پروفایل کاربری:**
   - خدمات، پروژه‌ها با مطالعهٔ موردی ۷بخشی، محصول شاخص `Pentestor` در `/projects/pentestor` (با ریدایرکت دائمی `308` از `/products/pentestor` طبق `ADR-0040`) و صفحهٔ «به‌زودی» برای `CRM` که هنوز در دیتابیس نیست، دوره‌های آکادمی با ثبت‌نام دانشجو، کتابخانهٔ مقالات با فهرست مطالب خودکار و کامنت‌های مدیریت‌شده، و جست‌وجوی تمام‌متن (Full-Text Search).
4. **موتور مرکزی هوش مصنوعی (`ai_engine`):**
   - مشاور ایده‌پرداز (تولید حداکثر ۳ ایدهٔ نرم‌افزاری فقط از روی گزینه‌های بستهٔ کاتالوگ بدون دریافت متن آزاد)، لینک اشتراک با توکن هش‌شده و قابل‌لغو، تخمین‌گر قطعی حداقل روز کاری (بدون قیمت عددی)، خلاصه‌ساز مقاله با تأیید ادمین، و Guardrail فرهنگی ایرانی.
5. **پنل مدیریت سطح SaaS:**
   - پوستهٔ سفارشی Jazzmin با لایهٔ RTL اختصاصی، داشبورد مدیریتی KPI با نمودارهای SVG، گردش‌کار انتشار گروهی، بازگردانی نرم‌حذف، صادرات/واردات دو مرحله‌ای CSV/TSV/JSON (محافظت‌شده در برابر Formula Injection) و احراز هویت دو مرحله‌ای (2FA TOTP + کدهای بازیابی).
6. **سئو، کارایی و امنیت سطح پروداکشن:**
   - `sitemap.xml` و `robots.txt` پویا، ۶ اسکیمای JSON-LD، تصاویر OpenGraph پویا (۱۲۰۰×۶۳۰)، فیدهای RSS بلاگ و آکادمی، ریدایرکت‌های `301/302/410` از ادمین، هدر CSP دو‌سیاستی، قفل ورود ضد brute-force (`429`) و دستور پشتیبان‌گیری `manage.py backup_db`.

---

## راه‌اندازی سریع در محیط توسعه

### ۱) بک‌اند (`backend/`)

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt

cp .env.example .env
python manage.py migrate
python manage.py seed_demo_data   # بارگذاری داده‌های نمونهٔ دوزبانه برای تمام صفحات
python manage.py runserver
```

- مستندات خودکار API:
  - Swagger UI: `http://127.0.0.1:8000/api/v1/schema/swagger-ui/`
  - ReDoc: `http://127.0.0.1:8000/api/v1/schema/redoc/`
  - پنل ادمین: `http://127.0.0.1:8000/admin/`

### ۲) فرانت‌اند (`frontend/`)

```bash
cd frontend
npm ci
npm run dev
```

- وب‌سایت به زبان فارسی (پیش‌فرض): `http://localhost:3000/`
- وب‌سایت به زبان انگلیسی: `http://localhost:3000/en`
- کاتالوگ زندهٔ سیستم طراحی: `http://localhost:3000/design-system`

---

## دروازه‌های کیفیت، تست و Pre-commit (فاز ۸)

تمام کدهای مخزن تحت لینت، فرمت و تایپ‌چک سخت‌گیرانه هستند (در فرانت‌اند `tsc --noEmit` روی **کل `src`**، در بک‌اند `ruff`/`black` روی **همه‌چیز**؛ تنها استثنا `mypy apps config` است که `backend/scripts/` را تایپ‌چک نمی‌کند). گیت پوشش تست روی **۸۵٪** تنظیم شده، اما **دامنهٔ اندازه‌گیری‌اش کل مخزن نیست**:

| | دامنهٔ گیت | پوششِ آن دامنه | پوششِ کل کد مربوطه |
|---|---|---|---|
| **بک‌اند** | `apps/` فقط (۱۵۷ فایل) | **۹۴٪** | **۹۲٪** با احتساب `config/` و `scripts/` |
| **فرانت‌اند** | `src/lib` و `src/components/{ui,molecules,organisms,seo}` — **۳۲ فایل از ۹۳** (مبنای شمار: ۹۶ فایلِ غیرتست در `src` منهای ۳ استثنای صریحِ `coverage.exclude`) | **۹۸٪** | **۴۱٫۶۷٪** اگر همهٔ `src` سنجیده شود |

در فرانت‌اند **۶۱ فایل سنجیده نمی‌شوند**: هر ۳۵ فایل `src/app/**` (۲۰ صفحه، ۴ ‏layout، ۳ ‏route handler، مرزهای خطا و ۴۰۴، به‌همراه `sitemap.ts`، `robots.ts`، `opengraph-image.tsx` و مسیر API پروکسی) روی **۰٫۴۸٪**، پوستهٔ `src/components/ui-port/**` (۲۲ فایل: خانه، navbar، هیرو، پالت ⌘K، بخش‌ها و فوتر) روی **۲۱٫۰۷٪**، `src/i18n/**` روی **۲۸٫۵۷٪** و `src/proxy.ts` روی **۰٪**. به‌علاوه `src/components/organisms/profile-view.tsx` (۲۵۰ خط کد اجرایی) صریحاً استثنا شده و پوششش **۰٪** است؛ با احتسابش معیار `branches` از ۷۸٫۳۱ به **۷۱٫۳۷** می‌افتاد و آستانهٔ ۷۸ را می‌شکست.

> **مبنای اعداد و تاریخِ اندازه‌گیری:** همهٔ اعدادِ این جدول از یک نشستِ اندازه‌گیریِ واحد روی کامیت `9c6d685` (پایان بستهٔ ۴) آمده‌اند — همان نشستی که بندِ ۶٫۴ در `docs/TECHNICAL_DOCUMENTATION.fa.md` تفصیلش را دارد. «۹۳ فایل» یعنی ۹۶ فایلِ غیرتستِ `src` منهای سه استثنای صریحِ `coverage.exclude`؛ «۶۱ فایلِ سنجیده‌نشده» یعنی ۹۳ − ۳۲. از آن کامیت تا امروز شمارِ فایل‌های `src` تغییر نکرده (۹۶ = ۹۶)، پس اعداد کهنه نشده‌اند؛ بستهٔ ۶ هم تستی اضافه نکرد که درصد‌ها را جابه‌جا کند.

این یک **بدهی فنیِ پذیرفته‌شدهٔ آگاهانه** است، نه خطای اندازه‌گیری: بستهٔ ۵ («صداقتِ پوشش») با تصمیم مالک به پس از استقرار موکول شد، هیچ آستانه‌ای پایین آورده نشد و CI بدون تغییر سبز است. کدِ سنجیده‌نشده هم بی‌محافظ نیست — **۶۰ تست E2E در ۹ فایل** روی Chromium واقعی و **Lighthouse CI با حداقل ۰٫۹۵** در CI اجرا می‌شوند و دقیقاً همان صفحات را در مرورگر می‌آزمایند. جدول کامل تفکیکی، دلیلِ هر عدد، کنترل‌های جبرانی و دستورِ بازتولید در [بند ۶.۴ مستندات فنی](docs/TECHNICAL_DOCUMENTATION.fa.md) آمده است.

دستورات بررسی محلی:

```bash
# اجرای هوک‌های Pre-commit روی کل مخزن
backend/.venv/bin/pre-commit run --all-files

# تست و کیفیت بک‌اند
cd backend && source .venv/bin/activate
ruff check . && ruff format --check . && black --check .
mypy apps config
bandit -c pyproject.toml -r apps config -ll
python scripts/i18n.py check
PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest -q && coverage report --fail-under=85 -m   # لایهٔ تنظیماتِ CI استوریج را به `StaticFilesStorage` ساده سوییچ می‌کند؛ در تنظیمات پایه نیز `NonStrictCompressedManifestStaticFilesStorage` فعال است تا هم اجرای مستقیم `pytest` و هم رندر قالب‌های دایرکتوری‌محور Jazzmin در پروداکشن بدون خطای manifest کار کند

# تست و کیفیت فرانت‌اند
cd ../frontend
npm run format:check && npm run lint && npm run typecheck
npm run test:coverage
npm run build
```

برای جزئیات کامل استقرار روی **هاست اشتراکی cPanel** و مرجع تمام Endpointهای API، به فایل یکپارچهٔ [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md) مراجعه کنید.
