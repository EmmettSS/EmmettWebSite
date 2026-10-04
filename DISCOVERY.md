# DISCOVERY.md — سند مرجع کشف ریپو و تصمیمات بنیادین پروژه

**شاخه کاری:** `arena/01a10793-emmettwebsite`
**کامیت پایهٔ بررسی‌شده:** `660dde9` ("first commit")
**نوع سند:** مرجع دائمی پروژه — در تمام فازهای توسعه (نه فقط فاز Discovery) باید به‌عنوان منبع حقیقت دربارهٔ وضعیت اولیهٔ ریپو و تصمیمات معماری پایه استفاده شود. این سند هر بار که تصمیم بنیادین جدیدی گرفته شود، به‌روزرسانی می‌شود.

---

## ۱. خلاصهٔ اجرایی

ریپوی اولیه یک خروجی خام از ابزار «Figma Make» بود (نام پکیج: `@figma/my-make-file`) — یک **فرانت‌اند تک‌صفحه‌ای (SPA) با React + Vite + TypeScript + Tailwind v4 + shadcn/ui** که به‌طور کامل توسط یک ابزار تولید UI با پرامپت ساخته شده بود. ویژگی‌های کلیدی وضعیت اولیه:

- فقط یک کامیت در تاریخچه (`first commit`)؛ بدون branch فیچر، PR یا Issue.
- بدون هیچ بک‌اندی: نه Django، نه DRF، نه فایل `.py`، نه مدل دیتابیس، نه API، نه احراز هویت، نه AI engine.
- بدون فایل Figma واقعی (`.fig`)؛ به‌جایش ۶ سند Markdown/txt در `src/imports/pasted_text/` که پرامپت‌های متنی داده‌شده به ابزار Figma Make برای تولید سایت هستند.
- محتوای رابط کاربری به‌طور کامل hard-code در فایل‌های `.ts/.tsx` (`content.ts` و object‌های محلی داخل کامپوننت‌ها) — بدون gettext یا هر سیستم ترجمهٔ استاندارد.
- زبان پیش‌فرض اولیه انگلیسی (`/en`) بود.
- حدود ۴۰٪ از کامپوننت‌های دامنه کد مرده (بدون استفاده در هیچ صفحه‌ای) بودند.
- چند وابستگی سنگین و بلااستفاده در `package.json` وجود داشت.
- `<meta name="robots" content="noindex, nofollow">` موتورهای جستجو را کامل بلاک کرده بود.
- فونت‌ها از CDN گوگل‌فونت بارگذاری می‌شدند (ریسک دسترسی از هاست/کاربر ایرانی).
- `npm audit` دو آسیب‌پذیری high (در `vite` و `react-router`) نشان داد.
- بدون `tsconfig.json`، تست، ESLint/Prettier، CI/CD، Docker یا `.gitignore`.

این پروژه از نظر بک‌اند، i18n استاندارد، AI، امنیت و SEO عملاً از صفر ساخته می‌شود؛ فرانت‌اند اولیه صرفاً به‌عنوان نقطهٔ شروع بصری (رنگ/تایپوگرافی/ریتم انیمیشن) ارزش نگه‌داشتن داشت و طبق تصمیمات بخش ۸ بازسازی می‌شود.

---

## ۲. نقشهٔ ریپو در لحظهٔ کشف (Repo Map — وضعیت اولیه)

```
EmmettWebSite/
├── ATTRIBUTIONS.md            # اعتبار shadcn/ui + عکس‌های Unsplash
├── README.md                  # راهنمای اجرا (npm + vite + vercel) — بدون اشاره به بک‌اند
├── default_shadcn_theme.css   # تم پیش‌فرض shadcn (استفاده نمی‌شود؛ theme.css جایگزین شده)
├── guidelines/Guidelines.md   # قالب خالی، هیچ‌وقت پر نشده
├── index.html                 # ورودی Vite؛ robots=noindex,nofollow، متای ژنریک انگلیسی
├── package.json                # نام پکیج «@figma/my-make-file» — بدون lint/test/typecheck script
├── package-lock.json
├── pnpm-workspace.yaml         # باقی‌ماندهٔ تنظیمات pnpm (ولی README از npm می‌گوید)
├── postcss.config.mjs
├── vercel.json                 # rewrite SPA برای دیپلوی روی Vercel (نه cPanel)
├── vite.config.ts              # alias @ ، resolver دارایی‌های figma:asset/*
├── dist/                       # build از پیش ساخته‌شده
└── src/
    ├── main.tsx                # ریشهٔ React
    ├── app/
    │   ├── App.tsx              # روتینگ (react-router 7) + Loader + Navbar + AnimatePresence
    │   ├── content.ts           # دیکشنری محتوای دوزبانهٔ صفحات داخلی (fa/en) — hard-coded
    │   ├── i18n.tsx             # LanguageProvider سبک: lang/rtl/path/switchLanguage، مبتنی بر URL param
    │   ├── components/          # ۲۹ کامپوننت دامنه + ۴۳ کامپوننت ui (shadcn)
    │   └── pages/                # ۸ صفحه
    ├── imports/
    │   ├── ____.jpg              # یک عکس import‌شده از Figma
    │   └── pasted_text/           # ۶ سند Markdown = تاریخچهٔ بریف طراحی داده‌شده به Figma Make
    └── styles/
        ├── fonts.css             # Google Fonts: Inter, JetBrains Mono, Newsreader, Vazirmatn
        ├── globals.css
        ├── index.css             # صرفاً import سه فایل دیگر
        ├── tailwind.css          # Tailwind v4 + tw-animate-css
        └── theme.css             # توکن‌های رنگ CSS variable (تم «Emerald»)
```

چیزهایی که در ریپوی اولیه وجود نداشتند: هر چیز بک‌اندی (Django project، اپ‌ها، مدل‌ها، API، سریالایزرها، migrations، تست‌ها)، اپ `ai_engine`، سیستم احراز هویت، پنل ادمین محتوا، فایل‌های `.po/.mo`، سیستم sitemap/robots دینامیک، CI/CD، تنظیمات cPanel/WSGI، `.env.example`، مستندات OpenAPI.

---

## ۳. تاریخچهٔ Git، Branchها و PRها

```
$ git log --oneline --all
660dde9 first commit

$ git branch -a
* arena/01a10793-emmettwebsite
  main
  remotes/origin/main

$ gh pr list --state all   → (خالی)
$ gh issue list --state all → (خالی)
```

فقط یک کامیت در کل تاریخچهٔ پروژه وجود دارد (export مستقیم از Figma Make)؛ هیچ Pull Request، Issue یا Branch فیچر دیگری ثبت نشده. تنها منبع برای «نیت طراحی» اسناد Markdown در `src/imports/pasted_text/` هستند.

---

## ۴. اسناد طراحی («Figma») و توکن‌های استخراج‌شده

هیچ فایل باینری `.fig` در ریپو نیست. ۶ سند زیر به‌عنوان بریف طراحی به ابزار تولید کد داده شده بودند:

| فایل | نقش | خلاصه |
|---|---|---|
| `emmett-design-spec.md` | بریف اولیهٔ کامل (Master Design Spec) | هویت «Obsidian + warm editorial». **در کد نهایی پیاده‌سازی نشده بود.** |
| `emmett-group-redesign.md` | بازطراحی «Premium Green» | حفظ هویت سبز فعلی؛ مبنای `theme.css` فعلی (Emerald) — **این نسخه مرجع نهایی انتخاب شد (بخش ۸).** |
| `product-design-spec.md` | بریف محصول‌محور (Pentestor + CRM) | جزئیات صفحات محصول که در کد فعلی فقط سبک پیاده شده‌اند |
| `emmett-group-prompt.md` / `emmett-group-prompt-1.md` | پرامپت‌های تکرارشوندهٔ تولید/اصلاح سایت | جزئیات کامپوننت‌به‌کامپوننت |
| `ui-refinement-prompt.md` | پرامپت پالایش UI | اصلاحات ریز تایپوگرافی/فاصله‌گذاری/موشن |
| `pasted-attachment.txt` | یادداشت کمکی | محتوای کمکی کوتاه‌تر |

### توکن‌های طراحی استخراج‌شده از `theme.css`

| دسته | نمونه توکن‌ها |
|---|---|
| پس‌زمینه‌های تیره | `--deep #06140E`, `--background #0B1F18`, `--card #102A20`, `--secondary #16382B` |
| پس‌زمینه‌های روشن | `--soft-green #DDEDE5`, `--warm-green-white #F1F7F3`, `--warm-ivory #F4F6F1` |
| برند/accent | `--primary #1FAE6E` (Emerald)، `--accent #35C98A`، `--bright #45E99B` |
| متن | `--foreground #F3FAF6`، `--muted-foreground rgba(243,250,246,.5)` |
| چارت | `--chart-1..5` (سبز/آبی/نارنجی/قرمز) |
| شعاع | `--radius 0.5rem` |
| تایپوگرافی | Inter (UI)، JetBrains Mono (متادیتا/فنی)، Newsreader (ادیتوریال/سریف)، Vazirmatn (فارسی) |

این توکن‌ها به‌صورت CSS variable مستقیم تعریف شده‌اند و با Tailwind v4 (`@theme`/`@source`) ترکیب شده‌اند.

---

## ۵. فهرست صفحات و کامپوننت‌ها (وضعیت اولیه)

### صفحات (`src/app/pages`)

| صفحه | وضعیت اولیه |
|---|---|
| `HomeBilingual.tsx` | فعال — مسیر `/{lang}/`، محتوای fa/en inline |
| `Page.tsx` | فعال — تمپلیت ژنریک برای ۷ صفحهٔ مختلف (services, products, pentestor, crm, projects, academy, about) |
| `Resources.tsx` | فعال — `/resources` (جایگزین Library) |
| `Contact.tsx` | فعال — فرم تماس بدون اتصال به API واقعی |
| `Home.tsx`, `ComingSoon.tsx`, `LanguagePortal.tsx`, `ImmersivePage.tsx` | کد مرده، بدون استفاده در روتینگ |

نکتهٔ IA: بریف اصلی صفحات مجزا و بصری کاملاً متفاوت برای Pentestor (تیره/cyan) و CRM (روشن/emerald) پیش‌بینی کرده بود؛ در کد اولیه هر دو از همان `Page.tsx` ژنریک رندر می‌شدند — این تفکیک بصری پیاده‌سازی نشده بود.

### کامپوننت‌های دامنه (`src/app/components`)

۲۹ فایل. استفاده‌شونده: `Navbar`, `Footer`, `Loader`, `MotionKit`, `Hero`, `CTA`, `Trust`, `Team`, `Projects`, `NeuralNetwork3D`, `ServicesSection`, `ProductsSection`, `ProjectsSection`, `AcademySection`, `LibrarySection`, `ContactSection`, `Workflow`.

کد مرده: `CustomCursor`, `Dashboard`, `Divisions`, `EngineeringTeaser`, `HomeCTA`, `Manifesto`, `ParticleField`, `ProductLabTeaser`, `ResearchLab`, `SignalRouting`, `Solutions`, `TechStack`.

### کامپوننت‌های UI (`src/app/components/ui`)

۴۳ کامپوننت استاندارد shadcn/ui (Radix-based). بسیاری (مثل `sidebar`, `calendar`, `command`, `carousel`, `menubar`, `context-menu`, `resizable`) برای یک سایت ویترین/مارکتینگ اضافی بودند و صرفاً بخشی از کیت پیش‌فرض shadcn تولیدشده توسط Figma Make محسوب می‌شدند.

---

## ۶. ارزیابی وابستگی‌های اولیهٔ `package.json`

| پکیج | استفاده در کد اولیه؟ | ارزیابی |
|---|---|---|
| `react`, `react-dom`, `react-router` | هسته | نگه‌داشته می‌شود، نسخه باید patch شود |
| `motion` (framer-motion) | زیاد | هسته انیمیشن، معقول |
| `@radix-ui/*`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority` | بله | زیرساخت shadcn، معقول |
| `@react-three/fiber`, `@react-three/drei`, `three` | بله (`NeuralNetwork3D`) | سنگین (~۶۰۰KB)؛ تناقض با ممنوعیت کلیشهٔ نورال‌نت در بریف طراحی |
| `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@popperjs/core`, `react-popper` | خیر | بلااستفاده، حذف شد |
| `react-dnd`, `react-dnd-html5-backend` | خیر | بلااستفاده، حذف شد |
| `react-slick` | خیر | بلااستفاده، حذف شد |
| `react-responsive-masonry` | خیر | بلااستفاده، حذف شد |
| `canvas-confetti` | خیر | بلااستفاده، حذف شد |
| `input-otp` | خیر (کامپوننت UI بدون فلوی واقعی) | مشروط به نیاز احراز هویت واقعی |
| `react-day-picker`, `date-fns` | کامپوننت calendar موجود، استفاده‌نشده | مشروط؛ با الزام تقویم شمسی نیاز به جایگزین/تکمیل دارد |
| `recharts` | فقط در `ui/chart.tsx` | مشروط به وجود داشبورد/آمار واقعی |

آسیب‌پذیری‌های شناسایی‌شده در `npm audit` زمان کشف: `react-router` (چند CVE شامل open redirect، XSS، DoS) و `vite` (path traversal در dev server) — باید در فاز سخت‌سازی امنیتی patch شوند.

---

## ۷. جمع‌بندی ریسک‌ها و نقاط ضعف کلیدی (در لحظهٔ کشف)

1. فقدان کامل بک‌اند — Django/DRF، مدل‌ها، ai_engine، احراز هویت، پنل مدیریت محتوا باید از صفر ساخته شوند.
2. بدون لایهٔ ترجمهٔ استاندارد — معماری i18n اولیه (URL param + دیکشنری JS) با نیاز گزارش‌شده (gettext، اعداد/تاریخ بومی) ناسازگار بود.
3. زبان پیش‌فرض اولیه انگلیسی بود؛ نیاز پروژه فارسی پیش‌فرض است.
4. کد مرده و وابستگی‌های یتیم — حدود ۴۰٪ کامپوننت‌ها و ۸ پکیج کامل بلااستفاده.
5. تناقض هویت بصری بین اسناد طراحی (Obsidian/warm در برابر Green/Emerald).
6. عدم تفکیک بصری محصولات Pentestor/CRM که در بریف اصلی تأکید ساختاری داشت.
7. وابستگی به CDN فونت گوگل — ریسک کارکرد روی هاست ایرانی.
8. `robots: noindex,nofollow` سایت را کامل از ایندکس موتورهای جستجو خارج کرده بود.
9. بدون تست، lint، typecheck، CI — هیچ Quality Gate خودکاری تعریف نشده بود.
10. `vercel.json` فرض دیپلوی روی Vercel داشت؛ هدف پروژه هاست اشتراکی cPanel ایرانی است — این دو با هم ناسازگار بودند.
11. فرم تماس بدون بک‌اند واقعی — نیاز به endpoint واقعی + rate limit + ضد اسپم.
12. بدون `tsconfig.json` — حتی type-safety فرانت اولیه برقرار نبود.

---

## ۸. تصمیمات بنیادین پروژه (Decisions Log)

این بخش منبع حقیقت برای معماری کلان پروژه است و باید در تمام ADRها و فازهای بعدی به آن ارجاع داده شود.

| # | موضوع | تصمیم |
|---|---|---|
| ۱ | معماری فرانت/رندر | **ترکیبی:** Next.js (SSR) به‌عنوان فرانت‌اند + Django/DRF به‌عنوان API مجزا، در یک مونو-ریپو |
| ۱-الف | پشتیبانی هاست cPanel از Node.js | هاست از «Setup Node.js App» (Phusion Passenger) پشتیبانی می‌کند؛ اجرای هم‌زمان دو پردازه (Django WSGI + Next.js Node) روی cPanel ممکن است |
| ۲ | هویت بصری نهایی | تم سبز/Emerald فعلی (مطابق `emmett-group-redesign.md`) مرجع نهایی برند است؛ بریف Obsidian کنار گذاشته شد |
| ۳ | زبان پیش‌فرض و ساختار URL | فارسی در ریشهٔ دامنه (`/`)، انگلیسی در `/en` |
| ۴ | دامنهٔ فیچرهای AI (فاز اول) | دستیار کشف نیاز مشتری (Enum-based) + ابزار کمک‌محتوا برای Library/Academy؛ هر دو منحصراً از طریق اپ `ai_engine` با Guardrail فرهنگی ایرانی |
| ۵ | محدودیت زیرساخت هاست | فرض محافظه‌کارانه: بدون Redis/Celery در دسترس؛ cache با backend دیتابیسی/فایلی Django؛ کارهای async با مکانیزم سبک (cron + management command) |
| ۶ | پاک‌سازی کد/وابستگی | مجاز و انجام‌شده — کد مرده و پکیج‌های بلااستفاده (MUI/emotion/react-dnd/popper/slick/masonry/confetti) حذف می‌شوند |
| ۷ | دادهٔ محتوا | فعلاً Placeholder؛ مدل‌ها و پنل ادمین طوری طراحی می‌شوند که بعداً با محتوای واقعی پر شوند بدون تغییر ساختار |
| ۸ | احراز هویت کاربر | لازم است — حساب کاربری واقعی (دانشجویان Academy، مشتریان) باید در بک‌اند طراحی شود |
| ۹ | کانال اطلاع‌رسانی | سرویس پیامکی ایرانی Kavenegar برای اعلان/OTP؛ پیاده‌سازی به‌صورت adapter قابل‌تعویض (`notifications` service) با کلید API در `.env` (هرگز hard-code)؛ کانال ایمیل به‌عنوان fallback پیکربندی‌پذیر (`django-environ` + `EMAIL_BACKEND`) حفظ می‌شود |
| ۱۰ | دامنه/SEO نهایی | هنوز مشخص نشده؛ تا تعیین، از دامنهٔ placeholder در `.env.example` استفاده می‌شود؛ تصمیم‌گیری در فاز SEO |
| ۱۱ | روش فازبندی | ترتیب و دانه‌بندی فازها از پیش توسط ایجنت قفل نمی‌شود؛ مالک محصول در هر نشست دامنهٔ دقیق کار همان نشست را مشخص می‌کند و چرخهٔ Discovery→Questions→Plan→ADR→Implementation→Test→Review→Document برای همان محدوده اجرا می‌شود |
| ۱۲ | ساختار ریپو | مونو-ریپو — `backend/` و `frontend/` درون همین ریپوی `EmmettWebSite` |

---

## گام بعدی

هر فاز جدید (Plan، ADR، Implementation و...) با دستور مشخص مالک محصول دربارهٔ دامنهٔ همان نشست آغاز می‌شود. این سند در طول پروژه به‌عنوان مرجع زمینه (context) نگه‌داری و در صورت تصمیمات بنیادین جدید به‌روزرسانی می‌شود.
