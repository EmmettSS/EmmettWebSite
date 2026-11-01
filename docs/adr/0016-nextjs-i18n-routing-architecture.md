# ADR-0016: معماری فرانت‌اند Next.js و مسیریابی دوزبانه (next-intl + proxy.ts)

**وضعیت:** پذیرفته‌شده

## زمینه

فاز ۳ («Frontend Foundation») با یک اسکلت قدیمی در ریشهٔ ریپو شروع شد: پروژهٔ React 18 + Vite + ۳۰+ کامپوننت shadcn/Radix/MUI، به‌علاوه ارجاع‌هایی در بریف اولیه به Alpine.js/HTMX. پیش از نوشتن هر کد جدید، طبق قانون ۲ (سؤال قبل از شروع) سه ابهام معماری/پوشه/داده از مالک محصول پرسیده شد:

1. آیا معماری فرانت‌اند همان `ADR-0001` (Next.js SSR) بماند یا به Vite خام/Alpine.js تغییر کند؟
2. کد جدید در ریشهٔ ریپو بماند یا به `frontend/` (هم‌تراز با `backend/`) منتقل شود؟
3. اسکلت React/Vite موجود دور ریخته شود، مستقیماً پورت شود، یا فقط به‌عنوان مرجع بصری نگه داشته شود؟
4. در نبود دسترسی واقعی به Figma، منبع توکن‌های طراحی چه باشد؟ (ر.ک. ADR-0017 برای جزئیات این بخش.)

## تصمیم

### ۱. پشتهٔ فرانت‌اند: Next.js (نه Vite خام)

مالک محصول صراحتاً `keep_nextjs` را انتخاب کرد: معماری همان `ADR-0001` (Next.js با رندر سمت سرور) می‌ماند. Alpine.js و HTMX — که ناسازگار با مدل کامپوننتی Next.js/React هستند و احتمالاً از یک قالب عمومی باقی مانده بودند — از scope فاز ۳ کاملاً حذف شدند.

نسخهٔ واقعی نصب‌شده **Next.js 16.3.8** با App Router و Turbopack (پیش‌فرض build این نسخه) است. نکات مهم سازگاری نسخه که در کد اثر گذاشتند:

- قرارداد `middleware.ts` در Next.js 16 منسوخ و با `proxy.ts` جایگزین شده (ر.ک. `node_modules/next/dist/docs/`)؛ کد پروژه از `src/proxy.ts` استفاده می‌کند، نه `middleware.ts`.
- کلید `eslint` دیگر در نوع `NextConfig` معتبر نیست (lint یک دستور کاملاً جدا شده با `eslint` CLI است، نه بخشی از `next build`)؛ `next.config.ts` پروژه فقط `typescript.ignoreBuildErrors: false` را نگه می‌دارد.

### ۲. ساختار پوشه: `frontend/` هم‌تراز با `backend/`

طبق تصمیم `move_to_frontend_dir`، تمام کد جدید در `frontend/` ساخته شد (نه در ریشهٔ ریپو)، منطبق با پلن مونوریپوی ADR-0001. ریشهٔ ریپو اکنون `backend/`، `frontend/`، و `legacy-frontend-reference/` را هم‌تراز دارد.

### ۳. سرنوشت اسکلت قدیمی: فقط مرجع، نه پورت مستقیم

طبق تصمیم `discard_reference_only`، پوشهٔ React/Vite قدیمی به `legacy-frontend-reference/` منتقل شد (نه حذف کامل) تا به‌عنوان مرجع بصری/رنگ/فونت/موشن در دسترس بماند، اما هیچ کامپوننت آن مستقیماً import/پورت نشد — هر atom/molecule/organism در `frontend/` از صفر و با معماری Next.js App Router + next-intl + Tailwind v4 CSS-first نوشته شده است.

### ۴. مسیریابی دوزبانه: `next-intl` با `localePrefix: "as-needed"`

طبق مأموریت صریح پروژه («فارسی پیش‌فرض، انگلیسی در `/en`»):

```ts
export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
  localeCookie: { name: "NEXT_LOCALE" },
});
```

نتیجه: فارسی بدون پیشوند (`/`, `/design-system`)، انگلیسی همیشه با پیشوند (`/en`, `/en/design-system`). تأیید شده با build واقعی: هر ۴ ترکیب (locale × صفحه) با موفقیت به‌صورت استاتیک (SSG) تولید می‌شوند.

به‌علاوه:

- `src/i18n/navigation.ts` → نسخهٔ locale-aware از `Link`/`usePathname`/`useRouter`/`redirect` (از `next/link`/`next/navigation` خام در کد اپ هرگز مستقیماً استفاده نمی‌شود).
- چون `app/layout.tsx` ریشه وجود ندارد، `app/[locale]/layout.tsx` خودش root layout است: `<html lang dir>` پویا را رندر می‌کند، `generateStaticParams` هر دو locale را برمی‌گرداند، و `setRequestLocale` هم در layout و هم در هر صفحه صدا زده می‌شود (الزام next-intl برای رندر استاتیک صحیح).

### ۵. گزینهٔ Figma: استفاده از دارایی‌های موجود

طبق تصمیم `use_existing_assets`، هیچ فایل/لینک/توکن Figma واقعی وجود نداشت؛ منبع رسمی توکن‌های طراحی `default_shadcn_theme.css` + اسناد Markdown در `legacy-frontend-reference/src/imports/pasted_text/` اعلام شد (جزئیات کامل در ADR-0017).

## دلیل

- Next.js SSR مطابق تصمیم معماری قبلی پروژه (ADR-0001) است و از ابتدای کار دوباره زیر سؤال نرفت؛ تغییر به Vite خام هزینهٔ بازنویسی معماری را بدون سود واضح تحمیل می‌کرد.
- جداسازی `frontend/`/`backend/` مطابق پلن مونوریپوی ثبت‌شده، مرز واضح بین دو سرویس مستقل (Next.js SSR در برابر Django API) ایجاد می‌کند و دیپلوی مستقل هرکدام را روی هاست اشتراکی ساده‌تر می‌کند.
- نگه‌داشتن اسکلت قدیمی فقط به‌عنوان مرجع (نه کد زنده) از دو مسئلهٔ همزمان جلوگیری کرد: از دست رفتن تصمیمات بصری قبلی (رنگ/فونت/موشن) و درهم‌تنیدگی کد React/Vite ناسازگار با الگوهای Next.js App Router (Server Components، فایل‌محوری مسیرها).
- `localePrefix: "as-needed"` دقیقاً رفتار خواستهٔ پروژه را بدون کد سفارشی پیاده می‌کند؛ next-intl این الگو را به‌صورت native پشتیبانی می‌کند.

## پیامدها

- هر صفحهٔ جدید فاز بعد باید زیر `app/[locale]/` ساخته شود و `setRequestLocale` را فراخوانی کند؛ فراموش کردن آن باعث غیرفعال‌شدن بهینه‌سازی رندر استاتیک next-intl می‌شود (نه خطای build، پس باید در بازبینی کد دستی چک شود).
- اگر در آینده مسیر پویا (`[slug]`) اضافه شود، `LocaleSwitcher` (که فعلاً فقط `pathname` ساده را سوآپ می‌کند) باید با `useParams` به‌روزرسانی شود تا پارامترهای مسیر را هم منتقل کند (یادداشت در کد ثبت شده).
- هر بار نسخهٔ Next.js ارتقا یابد، باید فایل `AGENTS.md`/`CLAUDE.md` تولیدشدهٔ خودکار `next dev` بازبینی شود (ممکن است قراردادهای جدیدی اعلام کند؛ این فایل‌ها عمداً commit می‌شوند، نه ignore).
