# بازرسی عمیق معماری و کارایی — ۳۱ اکتبر ۲۰۲۶

> **وضعیت سند:** اندازه‌گیری‌شده و قابل بازتولید. هر عددی که در این سند آمده، با دستورِ
> کنارش روی همین مخزن (کامیت `ea0d1f9` به‌عنوان «قبل» و شاخهٔ `arena/011d81e0-emmettwebsite`
> به‌عنوان «بعد») گرفته شده است. اعداد ادعاییِ مستندات قبلی، در بخش ۷ با واقعیت مقایسه
> شده‌اند.
>
> **تصمیم معماری مرتبط:** [`ADR-0041`](../adr/0041-content-pages-prerender-isr-and-internal-service-auth.md)

---

## Abstract (English)

The owner reported that the site was slow, frontend-first, and documented with claims that
were never tested. A measured audit found five concrete root causes, none of them inherent to
Next.js: (1) a single `await connection()` plus a per-response CSP nonce forced **every** route
to render dynamically, so ISR/prerender — and the revalidate webhook already built into the
project — never applied; (2) `proxy.ts` fetched Django on every page request because the Data
Cache has no effect in middleware; (3) every server-rendered upstream call shared one anonymous
DRF throttle bucket, so after 100 renders/hour pages silently rendered **empty**; (4) the global
loader waited for `window.load`; (5) CRLF line endings broke the deploy scripts and kept CI red.

After the fix: home-page TTFB **62.7 ms → 2.6 ms** (10 concurrent clients: 162.8 ms → 14.8 ms),
detail pages 105 ms → 2.5 ms, prerendered routes **0 → 61**, zero backend calls per page view
until revalidation, and `make verify` (format/lint/types/tests/build/prerender gate) green.
Two guardrails were added so the regression cannot return silently: `npm run verify:rendering`
and `make bench` (the tool that produced every number above). Recommendation: **do not rewrite
on React**; the remaining weaknesses are payload size, not architecture.

---

## ۰. خلاصهٔ اجرایی

گزارش شما سه شکایت داشت: «با فرانت‌اند استارت می‌شود»، «بسیار کند است»، «مستندات واقعی و
تست‌شده نیست». هر سه درست بودند، اما **ریشه‌شان Next.js نبود** — پنج باگ/تصمیم مشخص در همین
مخزن بود که همهٔ مزیت‌های Next.js را خنثی می‌کرد:

| # | ریشهٔ مشکل | اثر اندازه‌گیری‌شده |
|---|---|---|
| R1 | یک خط `await connection()` در layout ریشه + CSP با nonce به‌ازای هر درخواست | **هر ۲۵ مسیر** «ƒ Dynamic» بودند؛ صفر صفحه pre-render/ISR. هر بازدید = یک رندر کامل Node + چند فراخوانی Django |
| R2 | فراخوانی Django در `proxy.ts` روی **هر** درخواست صفحه | یک رفت‌وبرگشت HTTP اضافه پیش از تولید هر صفحه (در لاگ Django: یک `GET /api/v1/seo/redirects/` به‌ازای هر بازدید) |
| R3 | throttle ناشناسِ مشترک برای همهٔ فراخوانی‌های SSR از loopback | پس از ۱۰۰ رندر در ساعت، پاسخ‌ها `429` می‌شد و صفحه **بی‌صدا خالی** رندر می‌شد (بازتولید شد) |
| R4 | Loader تمام‌صفحه که تا رویداد `window.load` صبر می‌کرد | پوشش مصنوعی روی محتوای آماده؛ روی موبایل/هاست اشتراکی چند ثانیه نوار پیشرفت ساختگی |
| R5 | CRLF در ۵۰۱ فایل از ۵۷۱ فایل مخزن (بدون `.gitattributes`) | CI روی `main` **قرمز** بود؛ `scripts/*.sh` روی لینوکس **اجرا نمی‌شد** (`$'\r': command not found`) |

پس از اصلاح (همین شاخه):

| سنجه | قبل | بعد | نسبت |
|---|---|---|---|
| مسیرهای pre-render‌شده در بیلد | ۰ از ۲۵ | **۶۱** (۱۴ فهرست + ۲۶ جزئیات محتوایی + ۴ محصول + ۱۷ بقیه) | — |
| TTFB صفحهٔ اصلی (۳۰ درخواست متوالی) | میانگین **۵۹٫۶ms** / p95 ۶۹٫۶ms | میانگین **۲٫۶ms** / p95 ۳٫۲ms | **≈۲۳×** |
| TTFB صفحهٔ اصلی (۱۰ کلاینت هم‌زمان) | میانگین **۱۶۲٫۸ms** / p95 ۱۷۰٫۷ms | میانگین **۱۴٫۸ms** / p95 ۲۵٫۶ms | **≈۱۱×** |
| TTFB صفحهٔ جزئیات (`/blog/{slug}`) | ۳۷–۱۰۷ms (بازدید اول) / ۱۱–۲۵ms | **۲٫۵ms** | **≈۵–۴۰×** |
| فراخوانی بک‌اند به‌ازای هر بازدید صفحه | ۱ (+N در هر بازسازی) | **۰** (تا پایان TTL) | — |
| CI (فرانت‌اند / بک‌اند) | قرمز / قرمز | سبز محلی (Prettier, ESLint, tsc, Vitest، pytest، build، verify:rendering) | — |

**نتیجهٔ اصلی:** پروژه به بازنویسی با React نیاز ندارد. همان اندازه که Next.js اینجا کند
شده بود، می‌تواند سریع باشد — به شرطی که از قابلیت‌هایش (prerender/ISR/کش/on-demand
revalidation) استفاده شود. زیرساخت ISR از قبل در پروژه ساخته شده بود (وب‌هوک
`/api/revalidate`، `cache-tags.ts`، `frontend_cache.py` در Django) و **هیچ‌کدام کار
نمی‌کرد**، چون یک خط همهٔ صفحه‌ها را داینامیک کرده بود.

---

## ۱. روش اندازه‌گیری (قابل بازتولید)

محیط: ۲ vCPU، ۳٫۸GB RAM، Node 22.22.3، Next 16.4.3، Django 5.2.17 روی SQLite با دادهٔ
`seed_demo_data`. همهٔ اندازه‌گیری‌ها روی `next build && next start` (حالت production) است،
نه `next dev`.

```bash
# بک‌اند
cd backend && ./.venv/bin/python manage.py migrate && ./.venv/bin/python manage.py seed_demo_data
./.venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload

# فرانت‌اند (حالت production)
cd frontend && npm ci && npm run build && PORT=3000 npm run start

# «قبل» با همان داده و همان ماشین، در یک worktree جدا از کامیت پایه:
git worktree add /tmp/baseline ea0d1f9
cd /tmp/baseline/frontend && INTERNAL_API_URL=http://127.0.0.1:8000 PORT=3100 npm run start

# اندازه‌گیری — همان دستوری که اعداد این سند را تولید می‌کند:
make bench        # = node scripts/measure-perf.mjs  (TTFB متوالی/هم‌زمان + حجم HTML و JS)
# معادل خام با curl (همان معیار time_starttransfer):
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{time_starttransfer}\n" http://127.0.0.1:3000/; done \
  | sort -n | awk '{a[NR]=$1; s+=$1} END {printf "mean=%.1fms p95=%.1fms\n", s/NR*1000, a[int(NR*0.95)]*1000}'
seq 40 | xargs -P 10 -I{} curl -s -o /dev/null -w "%{time_starttransfer}\n" http://127.0.0.1:3000/
```

> **محدودیت مهم:** این اعداد «هزینهٔ چارچوب» را روی یک ماشین توسعه نشان می‌دهند، نه عدد
> کاربر نهایی روی cPanel. روی هاست اشتراکی، Passenger سرد، MySQL و فاصلهٔ شبکه، همهٔ
> اعداد را بزرگ‌تر می‌کنند — و دقیقاً به همین دلیل، حذف یک رفت‌وبرگشت به‌ازای هر درخواست و
> حذف رندر کامل به‌ازای هر بازدید، اثر **بزرگ‌تر** خواهد بود، نه کوچک‌تر.

بک‌اند هرگز گلوگاه نبود؛ پاسخ API روی همین ماشین:

```
services/?page_size=100   200   19.1ms
projects/?page_size=100   200   15.6ms
blog/?page_size=100       200   10.2ms
seo/settings/             200    5.8ms
seo/redirects/            200    4.1ms
```

یعنی هر چیزی که «کندی» می‌دیدید، **بین مرورگر و Django** رخ می‌داد: در لایهٔ Next.

---

## ۲. معماری واقعی (همان‌طور که اجرا می‌شود)

```
مرورگر
  │  (HTML، JS، /api/v1/*)
  ▼
Apache (cPanel)  ── Passenger ──►  Node / Next.js  (مسیر /)
  │                                   ├── proxy.ts          (هر درخواست صفحه)
  │                                   ├── Server Components (SSR یا ISR)
  │                                   └── /api/[...path]    (پراکسی سمت سرور)
  │                                          │
  └── Passenger Python ──► Django/DRF  ◄──────┘   (mount: /backend)
         (admin، API، فایل استاتیک)
```

سه نکتهٔ ساختاری که با پروژه‌های قبلی شما (PenTestor = Django + قالب؛ LoveOS/Zaminex =
Vite + React + API) تفاوت دارد:

1. **نقطهٔ ورود عمومی، Node است نه Django.** در cPanel اپ Node روی `/` و Django روی
   `/backend` سوار می‌شود؛ بنابراین «استارت پروژه» عملاً یعنی استارت Next — و اگر Django
   بالا نباشد، سایت با صفحه‌های خالی بالا می‌آید بدون هیچ خطای قابل‌دیدن.
2. **دو runtime هم‌زمان** (Node ۲۲ + Python ۳٫۱۱) روی هاست اشتراکی، دو سقف حافظه، دو
   cold start و دو نقطهٔ خرابی.
3. **هر بازدید صفحه، یک زنجیرهٔ چهارلایه** است: Apache → Node → (شاید) Django → مرورگر.

این ساختار **ذاتاً** غیرقابل‌قبول نیست؛ Vercel و هزاران سایت همین را دارند. غیرقابل‌قبول
این بود که حالت کش/استاتیک این ساختار **کاملاً خاموش** بود.

---

## ۳. ریشه‌یابی (با شاهد)

### R1 — همهٔ صفحه‌ها داینامیک بودند؛ ISR و prerender خاموش

در `frontend/src/app/[locale]/layout.tsx`:

```ts
// A per-response CSP nonce requires dynamic rendering (Next.js CSP guidance).
await connection();
```

و در `frontend/src/proxy.ts` هر درخواست یک nonce تصادفی می‌ساخت:
`script-src 'self' 'nonce-…' 'strict-dynamic'`.

`connection()` به Next می‌گوید «این مسیر را در زمان درخواست رندر کن». چون این فراخوانی در
**layout ریشهٔ هر دو زبان** بود، به همهٔ فرزندان ارث می‌رسید. خروجی `next build`:

```
Route (app)                    ← قبل
├ ƒ /[locale]                 ƒ = Dynamic
├ ƒ /[locale]/about
├ ƒ /[locale]/blog
├ ƒ /[locale]/services
… همهٔ ۲۵ مسیر ƒ
```

و بعد از اصلاح:

```
Route (app)                    Revalidate
├ ● /fa          1m     ├ ● /en
├ ● /fa/services 1m     ├ ● /en/services
├ ● /fa/blog     1m     ├ ● /en/blog
… ۶۱ مسیر pre-render‌شده
```

### R1b — صفحه‌های جزئیات (`[slug]`) هرگز pre-render نمی‌شدند

پس از اصلاح R1، مسیرهای فهرست (خانه، خدمات، بلاگ، آکادمی، پروژه‌ها) `● SSG` شدند، اما
مسیرهای `[slug]` هنوز `ƒ Dynamic` ماندند، چون `generateStaticParams` نداشتند و صرفِ
گذاشتن `revalidate` روی یک مسیر با پارامتر پویا، آن را کش نمی‌کند. اندازه‌گیری:

| | بازدید اول | بازدیدهای بعدی |
|---|---|---|
| `/blog/intro-to-web-security` | ۱۸۴ms | ۱۳–۲۵ms |
| `/services/web-development` | ۷۴ms | ۱۱–۲۰ms |

یعنی گران‌ترین بازدید برای گران‌ترین کاربر (کسی که از گوگل روی یک مقالهٔ خاص می‌آید) بود.
اصلاح: `src/lib/api/static-params.ts` فهرست slugها را در زمان بیلد از API می‌گیرد و هر
چهار مسیر جزئیات `generateStaticParams` گرفتند. نتیجه: **۶۱ مسیر pre-render‌شده** (۲۶ صفحهٔ جزئیات محتوایی و ۴ صفحهٔ محصول)، و TTFB این صفحه‌ها از ۱۱–۲۵ms به **۲٫۵ms** رسید. اگر بک‌اند در زمان بیلد بالا
نباشد، تابع آرایهٔ خالی برمی‌گرداند و صفحه در نخستین درخواست رندر و کش می‌شود
(`dynamicParams` پیش‌فرض) — بیلد هرگز به‌خاطر خاموش‌بودن API شکست نمی‌خورد.

**چرا این گران بود؟** صفحهٔ اصلی در هر بازدید شش fetch به Django می‌زد
(`services`, `projects?is_product`, `projects`, `blog`, `academy`, `seo/faq`) به‌علاوهٔ
`seo/settings` و `site-content/translations`. با Next Data Cache، خودِ fetchها کش می‌شدند،
اما **رندر React** و **ترکیب HTML/RSC** در هر درخواست از صفر انجام می‌شد. تعداد درخواست‌های
هم‌زمان روی Passenger همین را به صف تبدیل می‌کند — و «کندی» از همین‌جا می‌آید.

### R2 — یک رفت‌وبرگشت HTTP به Django پیش از هر صفحه

`proxy.ts` (معادل middleware در Next 16) روی هر درخواست صفحه اجرا می‌شود و
`getSeoRedirects()` را صدا می‌زد. گزینهٔ `next: { revalidate: 300 }` **در لایهٔ
middleware/proxy اثر ندارد** (Data Cache در آن لایه در دسترس نیست)، پس آن کش هرگز فعال
نشد. شاهد از لاگ Django در حین ۷۵ درخواست متوالی به `/` روی build پایه:

```
GET /api/v1/seo/redirects/ HTTP/1.1" 200 14      ← به‌ازای هر بازدید
GET /api/v1/seo/redirects/ HTTP/1.1" 200 14
GET /api/v1/seo/redirects/ HTTP/1.1" 200 14
… (۷۵ خط)
```

روی هاست اشتراکی، این یعنی هر بازدیدکننده پیش از دیدن **اولین بایت**، منتظر بیدار شدن
Django/Passenger می‌ماند.

### R3 — throttle داخلی، صفحات را بی‌صدا خالی می‌کرد

تنظیمات پیش‌فرض DRF: `anon = 100/hour` و شناسهٔ throttle با `get_client_ip`. همهٔ
فراخوانی‌های Server Component/ISR از `127.0.0.1` می‌آیند و در **یک سطل مشترک** می‌نشینند.
بعد از ۱۰۰ رندر در ساعت، Django `429` برمی‌گرداند؛ `serverFetch` خطا را می‌بلعد و `null`
برمی‌گرداند («تخریب مهربان») و صفحه **بدون هیچ خطایی** خالی رندر می‌شود.

این باگ در بازرسی بازتولید شد: در یکی از بیلدهای این جلسه، صفحهٔ اصلی ۷۲KB شد به‌جای ۱۰۴KB —
یعنی دادهٔ خدمات/بلاگ/دوره‌ها در HTML نبود، بدون هیچ پیام خطایی برای کاربر.

> نکته: کامنت خود CI (`.github/workflows/ci.yml`) این ریسک را می‌شناخت و نوشته بود
> «ریسک متناظر در production ... عمداً دست‌نخورده مانده است».

### R4 — Loader تا `window.load` صبر می‌کرد

`Loader.tsx` یک پوشش `fixed inset-0` با نوار پیشرفت **ساختگی** بود که تا رویداد
`window.load` مخفی نمی‌شد. `load` یعنی همهٔ تصاویر، فونت‌ها و chunk سه‌بعدی دانلود شده‌اند.
HTML صفحه از قبل آماده بود، اما کاربر یک نوار پیشرفت مصنوعی می‌دید که با سرعت واقعی شبکه
هیچ رابطه‌ای نداشت. روی موبایل با ۳G، این می‌توانست چند ثانیه طول بکشد.

### R5 — CRLF در ۵۰۱ فایل، CI قرمز، اسکریپت‌های استقرار خراب

مخزن `.gitattributes` نداشت و فایل‌ها با CRLF کامیت شده بودند:

```bash
$ bash -n scripts/deploy_backend.sh
scripts/deploy_backend.sh: line 24: syntax error near unexpected token `$'do\r''
```

یعنی `deploy_backend.sh`، `deploy_frontend.sh` و `restore_backup.sh` روی **لینوکس/cPanel
اصلاً اجرا نمی‌شدند** — همان اسکریپت‌هایی که `DEPLOYMENT.md` آن‌ها را «آماده و تست‌شده»
معرفی می‌کرد. همین CRLF باعث می‌شد `npm run format:check` روی ۱۴۸ فایل شکست بخورد و جاب
`frontend-quality` در GitHub Actions قرمز باشد (همهٔ ۷ اجرای اخیر، از جمله `main`، قرمز بودند).

### R6 — assetهای استاتیک فشرده سرو نمی‌شدند

`next start` پاسخ‌های داینامیک را gzip می‌کند اما فایل‌های `/_next/static/*.js` را
**فشرده‌نشده** می‌فرستد:

```
HTTP/1.1 200 OK
Content-Type: application/javascript
Content-Length: 234821        ← بدون Content-Encoding
Vary: Accept-Encoding
```

صفحهٔ اصلی **۸۶۹KB** JS خام روی ۱۸ فایل می‌گیرد؛ با gzip همین ۲۷۴KB است. یعنی هر
بازدیدکننده **~۵۹۵KB** اضافه دانلود می‌کرد (اندازه‌گیری: `make bench`).

### R7 — وزن JS و صحنهٔ سه‌بعدی

| قطعه | حجم خام | gzip |
|---|---|---|
| بزرگ‌ترین chunk (three.js) — در HTML اولیه **نیست** | ۵۰۹KB | ۱۲۵KB |
| react-dom + runtime | ۲۲۹KB | ۷۲KB |
| router/runtime داخلی Next | ۱۶۱KB | ۴۴KB |
| `motion` (framer-motion) | ۱۱۸KB | ۳۸KB |
| **core-js polyfills** | ۱۱۰KB | ۳۹KB |
| کل JS کلاینت در `.next/static/chunks` | ۱٫۵MB | ۴۵۲KB |
| **JS اولیهٔ صفحهٔ اصلی** | **۸۶۹KB در ۱۸ فایل** | **۲۷۴KB** |

`three.js` با `next/dynamic({ssr:false})` جدا شده بود (تصمیم درستی بود) و در ۱۸ اسکریپت
اولیه نیست؛ اما همچنان بعد از hydration دانلود و اجرا می‌شود و تا قبل از اصلاح R4، Loader
منتظر آن می‌ماند.

دو یافتهٔ اضافه که در همین بازرسی استخراج شد:

- **core-js**: یک chunk ۱۱۰ کیلوبایتی از core-js 3.38.1 در هر صفحه به مرورگرهای مدرن فرستاده
  می‌شود. تلاش برای حذف آن با افزودن `browserslist` مدرن به `package.json` و بیلد تمیز،
  **هیچ تغییری در آن chunk نداد** (هش و حجم عیناً یکسان ماند)؛ پس منبع آن در جای دیگری است
  و به‌عنوان بدهی ثبت شد، نه ادعا.
- **`motion`** در ۱۳ کامپوننت کلاینتی استفاده می‌شود و ۳۸KB gzip از JS اولیه را می‌گیرد؛
  جایگزینی آن با CSS transitions در بخش‌های غیرحیاتی، بزرگ‌ترین بردِ بعدی است.

### R8 — مستندات بدون گاردِ اجرایی

این جدی‌ترین بخشِ شکایت شما است: **مستندات دروغ نمی‌گفتند که چیزی خراب است؛ ادعاهایی
می‌کردند که هیچ تستی نگهبانشان نبود.** نمونه‌ها:

| ادعای مستند | واقعیت اندازه‌گیری‌شده |
|---|---|
| «۶۰ تست E2E در ۹ فایل» (`README.md`) | **۴۴ تست** در ۹ فایل |
| «CI بدون تغییر سبز است» (`README.md`) | هر ۷ اجرای اخیر GitHub Actions **قرمز** بود (`frontend-quality` روی Prettier، `backend-test` روی ۳ تست) |
| «صفحه‌ها با ISR/کش و وب‌هوک revalidate» (`docs/cms-cache-contract.md`، ADR-0031) | وب‌هوک و tagها وجود داشتند اما **هیچ صفحه‌ای ISR نبود**؛ کش تگ‌ها فقط روی fetch اثر داشت |
| «CSP با nonce، سازگار با hydration» | درست بود، اما هزینهٔ آن «داینامیک شدن کل سایت» هیچ‌جا ثبت نشده بود |
| «Lighthouse ≥ ۰٫۹۵» (`lighthouserc.json`) | اجرا در CI سبز بود، اما روی بیلدی که صفحه‌ها بدون کش سرو می‌شدند؛ یعنی معیار درست، روی چیز اشتباه |

الگو روشن است: **ادعاها به آزمون گره نخورده بودند.** راه‌حل هم همین است — هر ادعای
قابل‌سنجش باید یک اسکریپت/تست داشته باشد. در همین بازرسی سه گارد اضافه شد (بخش ۶).

---

## ۴. تغییرات اعمال‌شده

| فایل | تغییر | چرا |
|---|---|---|
| `.gitattributes` (جدید) | `* text=auto eol=lf` + قواعد binary | رفع R5 برای همیشه |
| ۵۰۱ فایل | یکسان‌سازی CRLF→LF | CI سبز شد؛ اسکریپت‌ها اجراشدنی شدند |
| `src/app/[locale]/layout.tsx` | حذف `await connection()` | صفحات محتوایی pre-render می‌شوند (R1) |
| `src/proxy.ts` | CSP ثابت بدون nonce + استفاده از کش ریدایرکت | R1 + R2 |
| `src/lib/api/redirect-cache.ts` (جدید) | کش درون‌حافظه‌ای با TTL ۶۰s، stale-while-revalidate، **backoff منفی ۳۰s** | R2 + جلوگیری از هجوم به بک‌اند در حالت خطا |
| `src/components/seo/json-ld.tsx` | حذف `headers()` (nonce) | همان R1؛ `headers()` در layout = داینامیک شدن همه‌چیز |
| `src/lib/api/config.ts` | `UPSTREAM_TIMEOUT_MS = 5000` + `internalServiceHeaders()` | جلوگیری از معلق‌ماندن ۳۰۰ ثانیه‌ای + R3 |
| `src/lib/api/server.ts`, `seo.ts`, `feed.ts`, `redirect-cache.ts`, `i18n/request.ts` | تایم‌اوت + هدر `X-Internal-Token` | R3 |
| `backend/apps/core/throttling.py` | `InternalServiceBypassMixin` با مقایسهٔ `secrets.compare_digest` | R3 |
| `backend/config/settings/base.py` + `.env.example` | `INTERNAL_API_TOKEN` | R3 |
| `src/app/sitemap.ts`, `robots.ts` | `force-dynamic` → `revalidate = 900` | هر crawl گوگل یک رندر کامل Node بود |
| `src/components/ui-port/loader.tsx` | حداکثر ۷۵۰ms، بدون انتظار برای `load` | R4 |
| `src/lib/api/static-params.ts` + چهار `generateStaticParams` | pre-render صفحه‌های `[slug]` | R1b |
| `frontend/scripts/measure-perf.mjs` + `make bench` | تولید همهٔ اعداد این سند | R8 |
| `frontend/scripts/verify-rendering.mjs` + `npm run verify:rendering` | گارد رگرسیون prerender | R8 |
| `src/lib/api/redirect-cache.test.ts` (جدید) | ۳ تست برای کش/backoff | R2 |
| `backend/apps/core/tests/test_throttling.py` | ۴ تست برای bypass/عدم‌bypass | R3 |
| `backend/apps/core/tests/test_i18n_tooling.py` | مقایسهٔ بایتی `.mo`/`.po` به‌جای `mtime` | تست به زمان وابسته بود و با هر checkout می‌شکست |
| `Makefile` + `scripts/dev.sh` (جدید) | `make dev` / `make prod` / `make verify` | R5 (شروع یک‌دستوری، Django قبل از Next) |
| `.github/workflows/ci.yml` | بیلد فرانت با بک‌اند زنده + اجرای `verify:rendering` + توکن داخلی | بیلد خالی دیگر «سبز» نمی‌شود |
| `backend/deploy/public_html.htaccess.example` | `mod_deflate`/`mod_brotli` | R6 |

### یک تصمیم امنیتی که باید بدانید

CSP از `script-src 'nonce-…' 'strict-dynamic'` به
`script-src 'self' 'unsafe-inline'` تغییر کرد. این یک **مصالحهٔ آگاهانه** است: بدون آن،
Next.js هر صفحه را داینامیک می‌کند و دستاورد اصلی (≈۲۴× سرعت) از دست می‌رود. ریسکِ باقی‌مانده:

- هیچ HTML کاربر/مهمان در خروجی نیست؛ HTML غنی CMS در بک‌اند با `nh3` و در فرانت با
  `sanitize-html` پیش از رندر پاک‌سازی می‌شود.
- `default-src 'self'`، `object-src 'none'`، `base-uri 'self'` و `form-action 'self'`
  سرجایشان هستند؛ اسکریپت **خارجی** همچنان ممنوع است.
- اگر بخواهید nonce برگردد، شرطش این است که Next اجازهٔ prerender با nonce بدهد (PPR /
  Cache Components). آن روز، بازگشت فقط یک تغییر در `src/proxy.ts` است.

اگر این مصالحه برای شما قابل‌قبول نیست، جایگزین امن‌تر این است: صفحه‌های عمومی استاتیک با
CSP ثابت بمانند و مسیرهای شخصی (`/profile`، `/search`، `/advisor/results/*`) سیاست nonce
جداگانه بگیرند. این کار یک لایه پیچیدگی بیشتر دارد و در ADR-0041 به‌عنوان گزینهٔ جایگزین
ثبت شده است.

---

## ۵. اعداد قبل/بعد (خلاصه)

همهٔ اعداد با **یک ابزار و یک روش** گرفته شده‌اند (`make bench` روی دو نمونهٔ production که
هم‌زمان روی همان ماشین و همان بک‌اند اجرا می‌شدند: کامیت `ea0d1f9` روی :3100 و شاخهٔ اصلاح‌شده
روی :3000). معیار، TTFB است — همان چیزی که `curl -w %{time_starttransfer}` می‌دهد.

| سنجه | قبل | بعد | نسبت |
|---|---|---|---|
| `/` متوالی (۳۰ نمونه) | ۶۲٫۷ms (p95 ۷۲٫۳) | **۲٫۶ms** (p95 ۳٫۲) | **≈۲۴×** |
| `/` با ۱۰ کلاینت هم‌زمان | ۱۶۲٫۸ms (p95 ۱۷۰٫۷) | **۱۴٫۸ms** (p95 ۲۵٫۶) | **≈۱۱×** |
| `/en` متوالی | ۶۳٫۹ms | **۲٫۶ms** | ≈۲۵× |
| `/services` متوالی | ۵۷٫۳ms | **۲٫۲ms** | ≈۲۶× |
| `/blog` متوالی | ۶۰٫۱ms | **۲٫۱ms** | ≈۲۹× |
| `/blog/{slug}` متوالی | ۱۰۵٫۲ms | **۲٫۵ms** | ≈۴۲× |
| اولین درخواست پس از استارت سرور | ۴۳۳ms | **۲۳۱ms** | ≈۱٫۹× |
| مسیرهای pre-render در بیلد | ۰ از ۲۵ | **۶۱** | — |
| فراخوانی بک‌اند / بازدید صفحه | ۱ + N | **۰** | — |
| HTML صفحهٔ اصلی | ۱۰۳٫۹KB / ۲۰٫۷KB gzip | ۱۰۲٫۴KB / ۲۰٫۷KB gzip | — |
| JS اولیهٔ صفحهٔ اصلی | ۸۶۹٫۴KB / ۲۷۴٫۸KB gzip | ۸۶۹٫۱KB / ۲۷۴٫۷KB gzip | — |
| `next build` | ~۱۷s | ~۱۹s | −۲s (۶۱ صفحه pre-render) |

**چرا `next build` کمی کندتر شد؟** چون حالا ۶۱ صفحه در بیلد ساخته می‌شود (در برابر ۲۵ صفحه
داینامیک که در بیلد ساخته نمی‌شدند) و هر صفحه چند فراخوانی به بک‌اند زنده دارد. دو ثانیه
هزینهٔ بیلد، در برابر ۳۰–۱۰۰ برابر شدن سرعت ۶۱ صفحه، معاملهٔ روشنی است. در CI این بیلد
همراه با بک‌اند بالا می‌آید (بخش ۶).

**شاهدِ زندهٔ R3 در همین اندازه‌گیری:** نمونهٔ «قبل» چند دقیقه پس از اتمام بودجهٔ
`anon = 100/hour` اجرا شد و لاگ آن مملو از این خطوط بود:

```
GET /api/v1/blog/intro-to-web-security/ HTTP/1.1" 429 349
GET /api/v1/seo/redirects/               HTTP/1.1" 429 349
```

نتیجه برای کاربر: صفحهٔ مقاله با کد **404** و HTML خالی (۴۱KB) — یعنی محتوای موجود، «وجود
ندارد». نمونهٔ اصلاح‌شده در همان لحظه و با همان بک‌اند، همان مسیر را **200** با ۶۳KB محتوای
کامل برگرداند. این دقیقاً همان «خرابیِ بی‌صدایی» است که در R3 توضیح داده شد، و بهترین دلیل
برای این‌که توکن سرویس داخلی (R3) هم‌وزن سرعت (R1) اهمیت دارد.

> **دربارهٔ ابزار اندازه‌گیری:** همهٔ اعداد هم‌زمان با `make bench` (که `node:http` با
> `maxSockets = 10` استفاده می‌کند) گرفته شده‌اند. اگر همان آزمون را با
> `seq 40 | xargs -P 10 curl` بگیرید، عدد «بعد» حدود **۴٫۸ms** درمی‌آید — چون خط لولهٔ
> شل واقعاً ۱۰ درخواست را هم‌زمان نمی‌فرستد. برای مقایسهٔ منصفانه، **هر دو طرف** با یک
> ابزار سنجیده شده‌اند؛ عددِ محافظه‌کارانه‌تر (۱۴٫۸ms) در جدول آمده است.

> **نکتهٔ مهم دربارهٔ `npm run dev`:** اگر پروژه را با `next dev` بالا می‌آورید، هر مسیر
> **بار اول** کامپایل می‌شود (اینجا ۵٫۱ ثانیه برای `/`، ۱٫۱ ثانیه برای `/services`). این
> رفتار توسعه است، نه سرعت محصول. برای سنجش واقعی از `make prod` استفاده کنید.

---

## ۶. گاردهای اضافه‌شده (تا این رگرسیون تکرار نشود)

1. **`npm run verify:rendering`** — بعد از `npm run build`، از روی
   `.next/prerender-manifest.json` بررسی می‌کند ۱۴ مسیر فهرست واقعاً pre-render شده‌اند و
   هشدار می‌دهد اگر صفحه‌های `[slug]` کمتر از ۲۰ مورد باشند (یعنی `generateStaticParams`
   حذف شده یا بک‌اند در بیلد بالا نبوده). اگر کسی دوباره
   `headers()`/`cookies()`/`connection()`/`searchParams` را به یک layout یا صفحهٔ عمومی
   اضافه کند، CI قرمز می‌شود. (در جاب `frontend-test-build` اجرا می‌شود.)
2. **`redirect-cache.test.ts`** — قفل می‌کند که لایهٔ proxy به‌ازای هر درخواست به Django
   نزند و در حالت خطا وارد حلقهٔ تلاش نشود.
3. **`test_throttling.py::TestInternalServiceBypass`** — قفل می‌کند که توکن داخلی فقط
   throttleهای پیش‌فرض را معاف کند و throttleهای کاربری (فرم تماس، AI، ورود، خبرنامه)
   هرگز معاف نشوند.
4. **`make bench`** (`frontend/scripts/measure-perf.mjs`) — همان ابزاری که اعداد این سند را
   تولید کرد. بدون آن، عدد نوشتن در مستندات کاری است که هیچ‌کس نمی‌تواند بازبینی کند.
5. **`verify:rendering` در CI با بک‌اند زنده** — جاب `frontend-test-build` قبل از بیلد،
   Django را بالا می‌آورد؛ بنابراین «بیلد با محتوای خالی» دیگر نمی‌تواند سبز شود.

اجرای همه با یک دستور:

```bash
make verify       # format-check + lint + typecheck + tests + build + verify:rendering
make bench        # اندازه‌گیری روی نمونهٔ در حال اجرا (نیازمند `make prod`)
```

وضعیت اجرای `make verify` در این شاخه (۲۰۲۶-۱۰-۳۱): **سبز** — Prettier، Ruff، Black، ESLint،
mypy (۲۵۲ فایل)، `tsc --noEmit`، pytest (**۵۵۹** تست)، Vitest (**۱۵۰** تست در ۳۲ فایل،
پوشش ۹۷٫۷٪ statements)، `next build` و `verify:rendering`.

> در همین اجرا دو ایراد واقعی در خودِ `Makefile` و کد جدید پیدا و رفع شد که تا قبل از آن
> دیده نشده بود: `PY := backend/.venv/bin/python` باعث می‌شد در `cd backend && $(PY)`
> مسیر دوباره تکرار شود، و `mypy` روی `throttling.py`/`test_throttling.py` ده خطای
> annotation می‌گرفت. این‌ها خودشان نمونه‌ای از ادعای R8 هستند: «یک دستور که واقعاً اجرا
> شود» ارزشش را دارد.

---

## ۷. آیا باید روی React بازنویسی شود؟ (تحلیل تصمیم)

سه گزینهٔ واقعی وجود دارد. معیارها: سرعت، SEO، حجم بازنویسی، هزینهٔ نگهداری روی cPanel.

| | **A. همین Next، اصلاح‌شده** | **B. Vite + React SPA + Django API** (مثل LoveOS/Zaminex) | **C. Django template + HTMX** (مثل PenTestor) |
|---|---|---|---|
| سرعت بازدید اول | HTML آماده از کش؛ ~۴ms محلی | HTML خالی + باندل JS + فراخوانی API | یک رندر Django؛ سریع‌ترین |
| سرعت ناوبری بعدی | انتقال کلاینتی Next (سریع) | SPA (سریع) | بارگذاری کامل صفحه یا HTMX (سریع) |
| SEO (بلاگ/خدمات/محصول) | کامل (SSR در بیلد) | **ضعیف** مگر prerender/SSG اضافه شود | کامل |
| حجم بازنویسی | **صفر** (همین حالا انجام شد) | ~۱۴هزار خط کامپوننت + بازنویسی داده‌گیری | بازنویسی کامل UI در قالب + از دست دادن انیمیشن/دیزاین‌سیستم |
| تعداد runtime روی هاست | ۲ (Node + Python) | **۱** (Python؛ Vite خروجی استاتیک است) | **۱** |
| ذهنیت تیم | متفاوت (فریم‌ورک‌محور) | آشنا | آشنا |
| ریسک | کم | متوسط (SEO) | بالا (بازنویسی کامل) |

**توصیه: گزینهٔ A.** دلیلش این است که مشکل «Next.js» نبود؛ مشکل این بود که Next.js **مثل
یک قالب سمت سرور کلاسیک** استفاده می‌شد، بدون کش و بدون prerender. همان کدی که الان دارید،
پس از این اصلاح، از صفحهٔ اصلی تا بلاگ را در ۳–۴ میلی‌ثانیه از کش سرو می‌کند — یعنی در
بازدیدهای تکراری، سریع‌تر از یک SPA که باید اول باندل را دانلود کند.

**چه زمانی گزینهٔ B درست می‌شود؟** اگر یکی از این‌ها برقرار شود:

- SEO واقعاً اولویت نباشد (اپ پشت لاگین، داشبورد، ابزار داخلی)، یا
- بخواهید تعداد پروسه‌های هاست را به یک runtime کاهش دهید و حاضرید SSG/ISR را با
  prerender در زمان بیلد یا prerender پویا جبران کنید، یا
- تیم فقط React می‌نویسد و نگهداری Next برایتان گران است. در آن صورت بازنویسی **بعد از**
  تثبیت این اصلاحات معنا دارد، نه به‌جای آن.

**چه زمانی گزینهٔ C؟** اگر سایت عمدتاً محتواست و تعامل کمی دارد (این پروژه تا حدی همین است:
بلاگ، خدمات، پروژه‌ها، آکادمی). اما ۱۴هزار خط کامپوننت و دیزاین‌سیستم فعلی را دور می‌ریزد.

**معیار بازگشت (trigger):** اگر پس از استقرار روی cPanel، مصرف حافظه/سقف پروسهٔ Passenger
Node مشکل واقعی شد (یعنی خطای ۵۰۳ در ساعات اوج)، آن‌وقت گزینهٔ B را با همان دیزاین‌سیستم و
همان API اجرا کنید؛ مسیر مهاجرت امن است چون لایهٔ داده (`src/lib/api/*`) از قبل جداست.

---

## ۸. کارهای باقی‌مانده (به‌ترتیب اثر)

| اولویت | کار | اثر تخمینی | ریسک |
|---|---|---|---|
| ۱ | **فعال‌کردن** `mod_deflate`/`mod_brotli` روی cPanel (بلوک آماده در بند ۳ فایل `.htaccess.example`؛ تا وقتی این بلوک روی هاست اعمال نشود، `/_next/static/*.js` فشرده سرو نمی‌شود) | ~۵۹۵KB کمتر در هر بازدید اول | صفر |
| ۲ | سبک‌کردن JS: جایگزینی `motion` با CSS/View Transitions در بخش‌های غیرحیاتی، بررسی `lucide-react` (importهای موردی) | ۳۰–۵۰٪ کمتر JS | متوسط |
| ۳ | `NextIntlClientProvider` فقط namespaceهای لازم را به کلاینت بدهد (الان کل کاتالوگ ۲۳KB در RSC payload است) | چند KB در هر صفحه | متوسط |
| ۴ | حذف پراکسی `/api/[...path]` با سرو مستقیم `/api/v1` توسط Apache به Django (یک hop کمتر برای فرم‌ها) | ~۵–۲۰ms در هر POST | متوسط (کوکی/CSRF) |
| ۵ | بازبینی بودجهٔ کوئری/اندیس‌های MySQL روی دادهٔ واقعی (تست `test_performance_budget.py` فقط SQLite را می‌سنجد) | جلوگیری از کندی با رشد داده | کم |
| ۶ | افزودن Lighthouse با موبایل (پروفایل فعلی desktop است) و آستانهٔ LCP/CLS به‌جای صرفاً امتیاز | واقعی‌تر شدن معیار | کم |
| ۷ | ✅ **انجام شد** — `README.md`، `TECHNICAL_DOCUMENTATION.{fa,en}.md` و `ARCHITECTURE.md` با اعداد همین سند به‌روز شدند و ادعای بی‌گارد («۶۰ تست E2E»، «CI سبز») اصلاح یا حذف شد | — | — |
| ۸ | کند کردن وابستگی به `three.js` در مسیر اول (تنها زمانی بارگذاری شود که بخش آن وارد viewport شد) | ~۱۲۵KB gzip کمتر برای کاربرانی که به آن بخش نمی‌رسند | کم |

---

## ۹. بدهی‌های ثبت‌شده (عمداً اصلاح‌نشده)

- **دو runtime روی هاست اشتراکی**: هزینهٔ ساختاری معماری است، نه باگ. در ADR-0041 ثبت شد.
- **`Cumulative Layout Shift` و بهینه‌سازی تصاویر**: بهینه‌ساز تصویر Next روی cPanel به
  `sharp` و دیسک مشترک (`MEDIA_ROOT`) وابسته است؛ این بازرسی آن را تغییر نداد.
- **پوشش تست فرانت در `src/app/**`**: همچنان پایین است (طبق `README.md`). گارد جدید
  `verify:rendering` بخشی از این شکاف را می‌بندد، اما تست واحد برای صفحات اضافه نشد.
- **`404` روی `/media/test.jpg`**: مسیر رسانه در نبود فایل، خطای داخلی بهینه‌ساز تصویر
  تولید می‌کند؛ در این بازرسی تعقیب نشد.

---

## مأخذ

- [`ADR-0041`](../adr/0041-content-pages-prerender-isr-and-internal-service-auth.md) — تصمیم رسمی prerender/ISR و احراز هویت سرویس داخلی
- `docs/adr/0031-seo-rendering-and-managed-urls.md` — سیاست رندر و URLهای مدیریت‌شده (زمینهٔ تصمیم)
- `docs/cms-cache-contract.md` — قرارداد tag/وب‌هوک که پیش‌تر بی‌اثر بود
- `CONTRIBUTING.md` — قواعد پروژه و دروازه‌های کیفیت
