# امت | Emmett

**فارسی — ابتدا** · React/Vite web app با API پایتون Django؛ طراحی‌شده برای استقرار استاتیک وب و cPanel مشترک.

## شروع توسعه

```bash
corepack enable
pnpm install
pnpm dev
```

از `http://localhost:5173` بازدید کنید؛ مسیر `/` به `/fa` هدایت می‌شود. API محلی:

```bash
cd api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

برای اجرای API در توسعه، آن را در ترمینال دوم روی پورت ۸۰۰۰ اجرا کنید؛ Vite مسیر نسبی `/api/v1` را به‌صورت server-side proxy می‌کند (`API_PROXY_TARGET` قابل تنظیم است). هیچ کد مرورگری به localhost وصل نمی‌شود.

## فرمان‌های کیفیت

پس از دریافت B1، مقدار `PUBLIC_SITE_URL` را به دامنهٔ واقعیِ تأییدشده تنظیم کنید؛ build عمداً بدون آن sitemap/canonical منتشر نمی‌کند:

```bash
export PUBLIC_SITE_URL="https://<دامنه-تأییدشده>"
pnpm build
pnpm --filter @emmett/web test
pnpm --filter @emmett/web typecheck
pnpm --filter @emmett/web content:check
pnpm --filter @emmett/web budget
cd api && .venv/bin/pytest --cov=apps --cov-report=term-missing
```

## ساختار

- `web/` برنامهٔ React/Vite، توکن‌های طراحی، کتابخانهٔ تاریخ شمسی و تومان
- `api/` Django REST API، admin/CMS و صف job مبتنی بر DB و cron
- `deploy/` فایل‌های استقرار cPanel و cron
- `docs/` معماری، ADRها، گزارش‌های فاز و موارد باز
- `prompts/` مرجع محصول و مشخصات فازها

## استقرار

وب‌کلاینت به‌صورت فایل‌های static از `web/dist` منتشر می‌شود. Django از طریق Python App/Passenger در cPanel اجرا می‌شود؛ هیچ Node runtime، Docker، Redis یا daemon لازم نیست. راهنما: [`deploy/DEPLOY-CPANEL.fa.md`](deploy/DEPLOY-CPANEL.fa.md).

## English

Emmett's bilingual product website: a Vite/React static frontend and a Django REST API designed for shared cPanel hosting. See the Persian setup above and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Root traffic defaults to `/fa`; English pages live under `/en`.
