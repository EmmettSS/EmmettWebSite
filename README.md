# Emmett — وب‌سایت شرکتی دوزبانه

مونوریپوی پروژهٔ Emmett: فرانت‌اند Next.js (دوزبانه فارسی/انگلیسی) + بک‌اند Django/DRF.

```
.
├── frontend/                   # Next.js 16 (App Router) + Tailwind v4 + next-intl — فاز ۳ تا ۵
├── backend/                    # Django 5.2 + DRF — فاز ۲ تا ۵
├── legacy-frontend-reference/  # اسکلت قدیمی React/Vite — فقط مرجع بصری، کد مستقیم استفاده نمی‌شود
├── docs/adr/                   # تصمیمات معماری (Architecture Decision Records)
├── ARCHITECTURE.md             # معماری کلی سیستم
├── DISCOVERY.md                # یافته‌های فاز کشف
└── CHANGELOG.md                # تاریخچهٔ کامل تغییرات به‌تفکیک فاز
```

> وضعیت فعلی (فاز ۵ پیاده‌سازی شده؛ جزئیات در `CHANGELOG.md` و `ADR-0026`): اپ مرکزی `ai_engine` با provider adapter سازگار با OpenAI، Catalogهای قابل‌مدیریت در DB، guardrail، audit یک‌ساله، cache و rate limit پیاده‌سازی شده است. مشاور ایده‌پرداز، نتیجهٔ عمومیِ قابل‌لغو و اتصال Lead، تخمین‌گر زمانِ بدون قیمت، و خلاصه‌ساز بلاگ با تأیید ادمین در دسترس‌اند. مسیرهای `/advisor`، `/advisor/results/[token]` و `/estimate` در هر دو زبان اضافه شده‌اند. AI به‌صورت پیش‌فرض غیرفعال است؛ برای فعال‌سازی فقط تنظیمات محیطی را در `.env` مقصد وارد کنید و هیچ کلیدی را در Git یا گفتگو قرار ندهید. تست‌ها و اعتبارسنجی‌های فاز ۵ در انتهای `CHANGELOG.md` ثبت شده‌اند.

برای معماری کامل و دلایل هر تصمیم، به `ARCHITECTURE.md` و `docs/adr/` مراجعه کنید.

## Frontend (Next.js) — `frontend/`

وب‌سایت عمومی: دوزبانه (فارسی پیش‌فرض بدون پیشوند `/`, انگلیسی با پیشوند `/en`)، RTL/LTR سطح کامپوننت، دارک/لایت‌مود، Design System کامل (atoms/molecules/organisms).

### راه‌اندازی محیط توسعه

```bash
cd frontend
npm install
npm run dev
```

سپس `http://localhost:3000` (فارسی) یا `http://localhost:3000/en` (انگلیسی) را باز کنید.

### دستورات کیفیت کد

```bash
cd frontend
npm run build       # next build — باید همیشه بدون خطا کامل شود
npx tsc --noEmit    # TypeScript strict (قانون ۷)
npm run lint        # eslint
npm run test        # vitest — تست واحد منطق (تاریخ/عدد) و کامپوننت
npm run test:e2e    # playwright — تست E2E مرورگر واقعی (نیاز به بک‌اند seed‌شده؛ ر.ک. frontend/e2e/README.md)
```

### صفحات مصرف‌کنندهٔ API (فازهای ۴ و ۵)

علاوه بر صفحهٔ اصلی و Design System (فاز ۳)، فرانت‌اند اکنون تمام محتوای
بک‌اند را مصرف می‌کند: `/services`, `/projects`, `/products`, `/academy`
(+ ثبت‌نام دوره)، `/blog` (+ فهرست مطالب و کامنت)، `/about` (تیم + نظرات)،
`/contact` (فرم لید + خبرنامه)، `/search` (جست‌وجوی سراسری FTS)، `/profile`
(ورود/ثبت‌نام/دوره‌های من/علاقه‌مندی‌ها). جزئیات کامل مسیرها و معماری اتصال
به بک‌اند (Server Components مستقیم / Client Components از طریق پراکسی
Route Handler) در `frontend/README.md`.

### صفحهٔ نمونهٔ Design System

به‌جای Storybook (ر.ک. ADR-0020)، یک صفحهٔ واقعی Next.js تمام atoms/molecules/organisms، رنگ‌ها، تایپوگرافی، و نمونهٔ بومی‌سازی تاریخ/عدد را نمایش می‌دهد:

- فارسی: `/design-system`
- انگلیسی: `/en/design-system`

### تصمیمات کلیدی فاز ۳ (جزئیات کامل در ADR)

- **پشته:** Next.js 16 (App Router) — نه Vite خام (`ADR-0016`).
- **i18n/مسیریابی:** `next-intl` با `localePrefix: "as-needed"`؛ `proxy.ts` (نه `middleware.ts` — قرارداد جدید Next.js 16) (`ADR-0016`).
- **توکن‌های طراحی:** از `legacy-frontend-reference/default_shadcn_theme.css` + اسناد `pasted_text/*.md`، بدون Figma واقعی (`ADR-0017`).
- **فونت:** فارسی = Vazirmatn، لاتین = Inter، مونو = JetBrains Mono — خوداستقرار (self-hosted) با `@fontsource/*`، نه `next/font/google` (شکست build-time در محیط‌های بدون دسترسی به `fonts.googleapis.com`) (`ADR-0018`).
- **تاریخ/عدد:** `dayjs`+`jalaliday` برای تقویم شمسی، `Intl.NumberFormat` بومی برای ارقام فارسی/لاتین؛ همیشه از `src/lib/format/{date,number}.ts` استفاده شود، هرگز مستقیم (`ADR-0019`).
- **موشن:** `motion/react` (Motion One/Framer Motion family)، با احترام کامل به `prefers-reduced-motion`.
- **تم:** `next-themes` (`localStorage` + `prefers-color-scheme`)؛ بخش‌های ادیتوریال برند (مثل Hero) مستقل از تم کاربر هستند (`ADR-0017`).

## Backend (Django) — `backend/`

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # ویندوز: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                # و مقادیر لازم را پر کنید
python manage.py migrate             # کاتالوگ‌های AI نیز با migration bootstrap می‌شوند
python manage.py seed_demo_data     # دادهٔ نمایشی دوزبانه (ایدمپوتنت) — ر.ک. فاز ۴ در CHANGELOG
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

راهنمای کامل‌تر توسعهٔ بک‌اند (ساختار اپ‌ها، امنیت/حسابرسی، محدودیت‌های
شناخته‌شده) در [`backend/README.md`](backend/README.md).

### دادهٔ نمایشی (Seed)

`python manage.py seed_demo_data` یک مجموعهٔ داده دوزبانهٔ واقع‌گرایانه و
ایدمپوتنت می‌سازد: کاربران (`admin@emmett.dev` ادمین، `author@emmett.dev`
ویرایشگر، `client@emmett.dev` مشتری)، تیم/نظرات مشتریان، خدمات، پروژه‌ها
(+ یک محصول و Case Study)، دوره‌های آکادمی (+ درس و یک Enrollment نمونه)،
پست‌های بلاگ (+ کامنت نمونه)، مشترک خبرنامه. رمز عبور پیش‌فرض dev با env
`DEMO_ADMIN_PASSWORD` قابل override است.

## Legacy Frontend Reference — `legacy-frontend-reference/`

اسکلت قدیمی React/Vite که پیش از تصمیم `ADR-0001` در ریشهٔ ریپو بود؛ فقط به‌عنوان مرجع بصری (رنگ/فونت/موشن) نگه داشته شده، کد آن مستقیماً در `frontend/` استفاده/پورت نشده است. جزئیات در `legacy-frontend-reference/README.md`.

جزئیات کامل تاریخچهٔ تغییرات در `CHANGELOG.md` ثبت می‌شود.
