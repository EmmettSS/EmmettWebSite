# Emmett — Frontend

فرانت‌اند دوزبانهٔ (فارسی RTL پیش‌فرض / انگلیسی LTR در `/en`) سایت امیت، با
Next.js 16 (App Router + Turbopack)، TypeScript strict، Tailwind v4 و
`next-intl`. برای تصمیمات معماری کامل، ADRهای `docs/adr/0016` تا `0025` را
ببینید؛ این فایل فقط راهنمای عملی توسعه است.

## اجرای محلی

```bash
# ۱) بک‌اند Django باید جداگانه در حال اجرا باشد (ر.ک. backend/README.md یا ARCHITECTURE.md)
cd backend && source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate && python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000

# ۲) در ترمینال دیگر، فرانت‌اند:
cd frontend
npm install
npm run dev
```

سایت روی <http://localhost:3000> بالا می‌آید (فارسی پیش‌فرض بدون پیشوند؛
انگلیسی روی `/en`).

### اتصال به بک‌اند

- **Server Components** (اکثر صفحات) مستقیماً بک‌اند را صدا می‌زنند:
  `INTERNAL_API_URL` (پیش‌فرض `http://127.0.0.1:8000`؛ در production باید به
  آدرس داخلی سرویس Django تنظیم شود). ر.ک. `src/lib/api/server.ts`.
- **Client Components** (فرم تماس، ورود/ثبت‌نام، کامنت، ثبت‌نام دوره،
  جست‌وجوی تعاملی) فقط از مسیر نسبی `/api/v1/...` استفاده می‌کنند. این مسیر
  توسط Route Handler `src/app/api/[...path]/route.ts` سمت سرور Next.js به
  همان `INTERNAL_API_URL` پراکسی می‌شود — از دید مرورگر هم‌مبدا است، پس کوکی
  سشن/CSRF بدون پیچیدگی CORS کار می‌کند. ر.ک. `src/lib/api/client.ts`.
  (چرا Route Handler به‌جای `rewrites()` در `next.config.ts`: کامنت بالای آن
  فایل را ببینید — موتور rewrite داخلی Next اسلش پایانی مسیرها را حذف
  می‌کرد و با `APPEND_SLASH` جنگو تداخل پیدا می‌کرد.)

## نقشهٔ مسیرها

| مسیر | محتوا |
| --- | --- |
| `/` | صفحهٔ اصلی (Hero) |
| `/services`, `/services/[slug]` | خدمات |
| `/projects`, `/projects/[slug]` | پروژه‌ها + Case Study |
| `/products` | همان دادهٔ پروژه با فیلتر `is_product=true` |
| `/academy`, `/academy/[slug]` | دوره‌ها + سرفصل + ثبت‌نام |
| `/blog`, `/blog/[slug]` | کتابخانه (مقالات) + فهرست مطالب + نظرات |
| `/about` | تیم + نظرات مشتریان |
| `/contact` | فرم تماس + عضویت خبرنامه |
| `/search` | جست‌وجوی سراسری (FTS بک‌اند) |
| `/profile` | ورود/ثبت‌نام/دوره‌های من/علاقه‌مندی‌ها (خارج از نوار ناوبری) |
| `/design-system` | صفحهٔ نمونهٔ کامپوننت‌ها (فاز ۳، برای بازبینی طراحی) |

۴۰۴/۵۰۰ سفارشی: `src/app/[locale]/not-found.tsx` و `[locale]/error.tsx`
(داخل layout با SiteHeader/SiteFooter)؛ `src/app/not-found.tsx` و
`global-error.tsx` فقط fallback نادر بیرون از `[locale]` هستند.

## تست

```bash
npm run test        # Vitest — تست واحد/کامپوننت
npm run test:watch
npm run test:e2e     # Playwright — تست E2E مرورگر واقعی (ر.ک. e2e/README.md)
npm run test:e2e:ui  # حالت تعاملی Playwright
npm run lint         # ESLint
npx tsc --noEmit     # بررسی نوع TypeScript (strict)
```

جزئیات پیش‌نیاز E2E (بک‌اند seed‌شده، نصب مرورگر Playwright، چرا باید در
برابر `next build && next start` اجرا شود نه `next dev`) در
[`e2e/README.md`](./e2e/README.md).

## ساختار کد

- `src/app/[locale]/` — صفحات (App Router)، یک لایه‌بندی مشترک در `layout.tsx`.
- `src/components/{ui,molecules,organisms}/` — سیستم طراحی (atoms در `ui/`).
- `src/lib/api/{types,server,client,config}.ts` — تایپ‌های TypeScript پاسخ API + توابع fetch سمت سرور/کلاینت.
- `src/i18n/{routing,navigation,request}.ts` — پیکربندی next-intl؛ همیشه از `Link`/`useRouter` در `navigation.ts` استفاده کنید، نه `next/link` خام (مگر وقتی مسیر از بک‌اند با locale از قبل prefix شده می‌آید، مثل نتایج جست‌وجو — آنجا از `next/link` خام استفاده می‌شود چون `url_path` بک‌اند خودش پیشوند locale دارد).
- `messages/{fa,en}.json` — تمام رشته‌های رابط کاربری (نه محتوای دیتابیسی، که خودش دوزبانه از API می‌آید).
