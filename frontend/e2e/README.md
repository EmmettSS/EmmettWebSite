# تست‌های E2E (Playwright)

این پوشه تست‌های سطح مرورگر (End-to-End) فاز ۴ را نگه می‌دارد (ر.ک.
[ADR-0023](../../docs/adr/0023-e2e-testing-playwright.md)). این تست‌ها با
Vitest (`frontend/src/**/*.test.tsx`) جایگزین نمی‌شوند — Vitest برای تست
واحد/کامپوننت می‌ماند، Playwright فقط برای جریان‌های کامل کاربر در مرورگر
واقعی است.

## پیش‌نیاز اجرا

E2E به یک بک‌اند Django **در حال اجرا و seed‌شده** نیاز دارد، چون:

- فرم تماس، ورود/ثبت‌نام، ثبت‌نام دوره و ثبت نظر واقعاً به `/api/v1/...`
  درخواست می‌زنند (از طریق پراکسی `src/app/api/[...path]/route.ts`).
- جست‌وجوی سراسری به FTS واقعی بک‌اند (نه داده‌ی mock) وابسته است.
- صفحات فهرست (`/services`, `/projects`, `/academy`, `/blog`, `/about`) با
  ISR (`revalidate: 60`) در **زمان build** پیش‌رندر می‌شوند؛ اگر بک‌اند هنگام
  `next build` در دسترس نباشد، این صفحات با دادهٔ خالی baked خواهند شد.

مراحل اجرای کامل (از ریشهٔ ریپو):

```bash
# ۱) بک‌اند را با دادهٔ seed بالا بیاورید (در یک ترمینال جدا، تا پایان تست‌ها باز بماند)
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000

# ۲) مرورگرهای Playwright را یک‌بار نصب کنید (نیاز به دسترسی شبکه به cdn.playwright.dev)
cd frontend
npx playwright install chromium

# ۳) تست‌ها را اجرا کنید — این دستور خودش next build && next start را هم اجرا می‌کند
INTERNAL_API_URL=http://127.0.0.1:8000 npm run test:e2e
```

برای حالت تعاملی توسعه (مشاهدهٔ هر قدم در UI Playwright):

```bash
npm run test:e2e:ui
```

## ساختار

- `public-pages.spec.ts` — ناوبری، فهرست/جزئیات خدمات/پروژه‌ها/محصولات/آکادمی/بلاگ، ۴۰۴ سفارشی، حالت «کاربر مهمان» (لینک ورود به‌جای ثبت‌نام/کامنت).
- `search.spec.ts` — جست‌وجوی سراسری (نتیجهٔ واقعی FTS + حالت بدون‌نتیجه).
- `contact.spec.ts` — فرم تماس (موفق/اعتبارسنجی native) + فرم خبرنامه.
- `profile-auth.spec.ts` — ثبت‌نام → ورود خودکار → ثبت‌نام دوره → ثبت نظر → مشاهده در پروفایل → خروج (یک تست یکپارچه تا کوکی سشن بین مراحل حفظ شود).
- `locale.spec.ts` — تنها فایلی که در هر دو پروژهٔ `fa-locale`/`en` اجرا می‌شود؛ `dir`/عنوان/برچسب ناوبری را برای هر دو زبان بررسی می‌کند.

## محدودیت شناخته‌شده این محیط (sandbox)

در sandboxی که فاز ۴ در آن توسعه داده شد، دامنهٔ `cdn.playwright.dev` از
شبکهٔ sandbox در دسترس نبود (TLS handshake reset)، بنابراین باینری مرورگر
Chromium قابل‌نصب نبود و `npm run test:e2e` در آن محیط واقعاً اجرا نشد. سوییت
تست با `npx playwright test --list` اعتبارسنجی ساختاری شد (۱۸+ تست در ۵
فایل، بدون خطای TypeScript/ESLint) و تمام جریان‌های کاربری معادل آن
(ثبت‌نام/ورود/CSRF/فرم تماس/ثبت‌نام دوره/جست‌وجو) به‌صورت دستی در سطح HTTP
(`curl` از طریق پراکسی Next.js) تأیید شدند. در هر محیط با دسترسی شبکهٔ کامل
(مثل CI)، `npx playwright install chromium` باید یک‌بار اجرا شود و سپس
`npm run test:e2e` باید بدون تغییر کار کند.
