# Changelog

فرمت این فایل بر اساس [Keep a Changelog](https://keepachangelog.com/) است. هر فاز پروژه یک بخش مستقل دارد.

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
