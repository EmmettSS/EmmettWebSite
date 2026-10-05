# Emmett — وب‌سایت شرکتی دوزبانه

مونوریپوی پروژهٔ Emmett: فرانت‌اند Next.js (دوزبانه فارسی/انگلیسی) + بک‌اند Django/DRF.

```
.
├── frontend/                   # Next.js 16 (App Router) + Tailwind v4 + next-intl — فاز ۳ تا ۵
├── backend/                    # Django 5.2 + DRF — فاز ۲ تا ۵
├── legacy-frontend-reference/  # اسکلت قدیمی React/Vite — فقط مرجع بصری، کد مستقیم استفاده نمی‌شود
├── docs/adr/                   # تصمیمات معماری (Architecture Decision Records)
├── docs/admin-guide-fa.md       # راهنمای فارسی پنل مدیریت (فاز ۶ + بخش‌های SEO/۲FA فاز ۷)
├── ARCHITECTURE.md             # معماری کلی سیستم
├── DISCOVERY.md                # یافته‌های فاز کشف
└── CHANGELOG.md                # تاریخچهٔ کامل تغییرات به‌تفکیک فاز
```

> وضعیت فعلی (فاز ۷ پیاده‌سازی شده؛ جزئیات در `CHANGELOG.md` و `ADR-0031`–`ADR-0033`):
> **SEO در لایهٔ Next.js** ساخته می‌شود (sitemap/robots پویا، hreflang `fa-IR`/`en`/`x-default`
> با canonical خودارجاع، JSON-LD شش‌نوعه، OG پویا با تصویر ۱۲۰۰×۶۳۰، RSS/Atom بلاگ و دوره)
> و Django فقط منبع داده/ادمین است؛ دامنهٔ canonical تنها از `PUBLIC_SITE_URL` می‌آید.
> **کارایی** با معیار جانشین اندازه‌گیری‌پذیر تضمین شده است: تصویر AVIF/WebP با `next/image`،
> فونت خودمیزبان با `font-display: swap` و سقف تعداد کوئری هر endpoint در تست‌ها.
> **امنیت**: CSP دو‌سیاستی (API سخت / ادمین سازگار Jazzmin)، 2FA اختیاری/اجباری ادمین با
> TOTP + کد بازیابی، قفل ورود ضدbrute-force با پاسخ `429`، Audit Log رویدادهای امنیتی و
> دستور `backup_db` با fallback چند-strategy.
>
> وضعیت قبلی (فاز ۶؛ جزئیات در `ADR-0027`–`ADR-0030`):
> پنل مدیریت Django حالا یک **پنل SaaS فارسی/انگلیسی** است: تم اختصاصی امیت با RTL واقعی
> و فونت خودمیزبان، داشبورد KPI کش‌شده با نمودار SVG درون‌خطی، گردش‌کار گروهی انتشار
> (Draft→Published→Archived) با ثبت `AuditLog`، مدیریت ترجمه‌ها و کاتالوگ/پرامپت‌های AI
> در ادمین، صادرات/واردات CSV/JSON/TSV با تست idempotency، نرم‌حذف/بازگردانی و جست‌وجو/فیلتر
> پیشرفته. هیچ مدل مالی و هیچ فیلد/وضعیت جدیدی در این فاز اضافه نشده است. راهنمای کاربری
> پنل: [`docs/admin-guide-fa.md`](docs/admin-guide-fa.md).

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
python manage.py check                          # System Checkها (emmett_admin.E001–W013)
python manage.py check --deploy                 # هشدارهای مخصوص production (۲FA/CSP/بکاپ/راز)
python scripts/i18n.py check                     # یکسانی .po و تازگی .mo (ADR-0030)
python manage.py backup_db --keep 7              # پشتیبان دیتابیس (+مدیا) — ADR-0033
```

### مستندات API

با اجرای سرور توسعه، مستندات خودکار OpenAPI (تولیدشده با `drf-spectacular`) در دسترس است:

- Swagger UI: `/api/v1/schema/swagger-ui/`
- ReDoc: `/api/v1/schema/redoc/`
- Health check: `/api/v1/health/`

راهنمای کامل‌تر توسعهٔ بک‌اند (ساختار اپ‌ها، امنیت/حسابرسی، محدودیت‌های
شناخته‌شده) در [`backend/README.md`](backend/README.md).

### پنل مدیریت (Admin) — فاز ۶

پنل مدیریت (`/admin/`) برای استفادهٔ روزمرهٔ تیم محتوا/فروش آماده شده است:

- **تم و RTL:** Jazzmin + لایهٔ RTL/برند اختصاصی امیت (`#5b62e0`/`#1fae6e`)، فونت
  وزیرمتن خودمیزبان و بدون هیچ CDN (`ADR-0027`).
- **داشبورد KPI:** کاربران، درخواست‌های AI، Leadها و نرخ تبدیل، دوره‌ها/ثبت‌نام‌ها،
  سیگنال‌های فروش (بدون مدل مالی) و خلاصه‌های در انتظار تأیید + نمودار ۸ هفته‌ای
  و ویجت‌های اقدامات اخیر (`ADR-0028`).
- **گردش‌کار انتشار:** اکشن‌های گروهی انتشار/بازگشت به پیش‌نویس/بایگانی با ستون وضعیت
  رنگی و ثبت `AuditLog` برای هر اقدام؛ بدون وضعیت `review` و بدون migration (`ADR-0028`).
- **ترجمه و i18n:** مدیریت `core.Translation` با فیلتر «کامل‌بودن ترجمه» و اکشن ساخت
  ردیف زبان غایب؛ ابزار `python scripts/i18n.py {extract,compile,check,stats}` و
  System Check برای تازگی `.mo` (`ADR-0030`).
- **Catalog/Prompt AI:** نسخه‌دار، با کلید تغییرناپذیر پس از ساخت و اکشن بایگانی
  نسخه‌های قدیمی؛ هر تغییر در `AuditLog` (`ADR-0026`/`ADR-0028`).
- **صادرات/واردات:** `django-import-export` با CSV/JSON/TSV، واردات دو مرحله‌ای
  (پیش‌نمایش → تأیید)، escape فرمول در CSV و کلیدهای پایدار برای idempotency (`ADR-0029`).
- **نرم‌حذف/بازگردانی، جست‌وجوی دوزبانه، autocomplete و فیلترهای پیشرفته** روی همهٔ
  مدل‌های محتوایی.

راهنمای گام‌به‌گام فارسی: [`docs/admin-guide-fa.md`](docs/admin-guide-fa.md).

### SEO، کارایی و امنیت (فاز ۷)

- **ابزار پیکربندی‌محور (نه کد):** متای پیش‌فرض، کد تأیید Search Console، FAQ هر صفحه،
  ریدایرکت‌های ۳۰۱/۳۰۲/۴۱۰ و دو شبکهٔ اجتماعی در ادمین ویرایش می‌شوند
  (`Site settings`, `Redirects`, `FAQ items`) و از API به فرانت می‌رسند (`ADR-0031`).
- **دامنه:** فقط `PUBLIC_SITE_URL` (env) — نه hard-code، نه هدر `Host`. در
  `manage.py check --deploy` خالی/پیش‌فرض‌بودن آن خطا است (`W007`).
- **نقشهٔ خودکار:** `sitemap.xml` و `robots.txt` در Next.js ساخته می‌شوند؛ مسیرهای خصوصی
  (`/admin`, `/api`, `/profile`, `/search`, `/advisor/results/*`) هم `noindex` هستند و هم
  از sitemap حذف می‌شوند.
- **فیدها:** `/blog/rss` و `/academy/rss` (RSS 2.0 + `atom:link`)؛ مسیر قدیمی
  `/api/v1/blog/rss/` هم برای سازگاری حفظ شده است.
- **۲FA ادمین:** `/admin/2fa/setup|verify|status|recovery` — TOTP با QR درون `data:`
  (بدون CDN)، کلید Base32 برای ورود دستی، کدهای بازیابی یک‌بارمصرف و قفل موقت پس از
  چند کد نامعتبر. در production `ADMIN_2FA_REQUIRED=True` پیش‌فرض است (`ADR-0033`).
- **بکاپ:** `python manage.py backup_db` — روی SQLite با `VACUUM INTO` (سازگار با قفل
  pytest/سایت زنده)، روی MySQL با `mysqldump` و در نبودش fallback به `dumpdata`؛
  خروجی `gz` + `manifest-{stamp}.json` + هرس خودکار بر اساس `BACKUP_RETENTION`.
- **مستندسازی:** تصمیم‌ها در `docs/adr/0031`–`0033`؛ چک‌لیست استقرار و راهنمای ۲FA/SEO
  در [`docs/admin-guide-fa.md`](docs/admin-guide-fa.md).

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
