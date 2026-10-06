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
| [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md) | **مرجع فنی جامع در یک فایل (فارسی):** معماری، فهرست ۳۶ ADR، مستندات کامل API، راهنمای ادمین، راهنمای استقرار روی cPanel و پایپ‌لاین CI/CD |
| [`docs/TECHNICAL_DOCUMENTATION.en.md`](./docs/TECHNICAL_DOCUMENTATION.en.md) | **Unified Single-File Technical Documentation (English):** Architecture, 36 ADRs, Full API Reference, Admin Guide, cPanel Deployment Guide, and CI/CD |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | معماری سیستم، نمودار ERD و فهرست تصمیمات معماری (`ADR-0001` تا `ADR-0036`) |
| [`docs/admin-guide-fa.md`](./docs/admin-guide-fa.md) | راهنمای تفصیلی پنل ادمین سطح SaaS، داشبورد KPI، گردش‌کار انتشار، 2FA و بکاپ |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | راهنمای مشارکت، ۲۰ قانون سخت‌گیرانه، فرمت Conventional Commits و گیت‌های کیفیت |
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
   - خدمات، پروژه‌ها با مطالعهٔ موردی ۷بخشی، صفحهٔ اختصاصی محصولات شاخص (`Pentestor` و `CRM`)، دوره‌های آکادمی با ثبت‌نام دانشجو، کتابخانهٔ مقالات با فهرست مطالب خودکار و کامنت‌های مدیریت‌شده، و جست‌وجوی تمام‌متن (Full-Text Search).
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

تمام کدهای مخزن تحت پوشش سخت‌گیرانهٔ لینت، تایپ‌چک و تست (با حداقل پوشش **۸۵٪**؛ پوشش فعلی بک‌اند **۹۲٪** و فرانت‌اند **۹۷.۷٪**) هستند:

```bash
# اجرای هوک‌های Pre-commit روی کل مخزن
backend/.venv/bin/pre-commit run --all-files

# تست و کیفیت بک‌اند
cd backend && source .venv/bin/activate
ruff check . && ruff format --check . && black --check .
mypy apps config
bandit -c pyproject.toml -r apps config -ll
python scripts/i18n.py check
coverage run -m pytest -q && coverage report --fail-under=85 -m

# تست و کیفیت فرانت‌اند
cd ../frontend
npm run format:check && npm run lint && npm run typecheck
npm run test:coverage
npm run build
```

برای جزئیات کامل استقرار روی **هاست اشتراکی cPanel** و مرجع تمام Endpointهای API، به فایل یکپارچهٔ [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./docs/TECHNICAL_DOCUMENTATION.fa.md) مراجعه کنید.
