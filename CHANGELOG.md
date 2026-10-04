# Changelog

فرمت این فایل بر اساس [Keep a Changelog](https://keepachangelog.com/) است. هر فاز پروژه یک بخش مستقل دارد.

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
