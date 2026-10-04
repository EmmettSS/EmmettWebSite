# Emmett — Bilingual Emerald Edition

A bilingual Persian/English React experience built with Vite, TypeScript, Tailwind CSS and Motion.

## اجرا در ویندوز

```powershell
npm install --legacy-peer-deps
npm run dev
```

سپس آدرس `http://localhost:5173` را باز کنید. سایت با زبان English باز می‌شود و کاربر از کنترل همیشه‌در‌دسترس `EN / FA` داخل Navbar زبان را تغییر می‌دهد.

## Production build

```bash
npm run build
npm run preview
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Install command: `npm install --legacy-peer-deps`

The included `vercel.json` keeps `/fa/...` and `/en/...` routes working after a direct refresh.

## معماری زبان

- مسیرهای مستقل `/fa/...` و `/en/...`
- انتخاب‌گر متحرک `EN / FA` داخل Navbar و ذخیره انتخاب در `localStorage`
- تغییر هم‌زمان `lang` و `dir` سند
- فونت Vazirmatn و چیدمان RTL برای فارسی
- محتوای فارسی بازنویسی‌شده و مستقل از ترجمه لفظی

## Accessibility & motion

Keyboard focus, semantic labels, responsive layouts and `prefers-reduced-motion` are supported.

## Backend (Django) — `backend/`

کد بک‌اند پروژه (Django 5.2 + DRF) در پوشهٔ `backend/` قرار دارد و مستقل از فرانت‌اند ریشهٔ ریپو توسعه داده می‌شود. برای معماری کامل، ADRها و جزئیات تصمیمات به `ARCHITECTURE.md` و `docs/adr/` مراجعه کنید.

### راه‌اندازی محیط توسعه

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # ویندوز: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                # و مقادیر لازم را پر کنید
python manage.py migrate
python manage.py runserver
```

### اجرای تست‌ها و بررسی کیفیت کد

```bash
cd backend
source .venv/bin/activate
coverage run -m pytest && coverage report -m   # تست‌ها + پوشش
mypy apps config                                # mypy --strict (قانون ۷)
ruff check .                                    # lint
```

### مستندات API

با اجرای سرور توسعه، مستندات خودکار OpenAPI (تولیدشده با `drf-spectacular`) در دسترس است:

- Swagger UI: `/api/v1/schema/swagger-ui/`
- ReDoc: `/api/v1/schema/redoc/`
- Health check: `/api/v1/health/`

جزئیات کامل تاریخچهٔ تغییرات در `CHANGELOG.md` ثبت می‌شود.
