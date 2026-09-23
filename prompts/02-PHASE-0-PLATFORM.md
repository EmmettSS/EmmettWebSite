# فاز ۰ — پایه و بنیاد
### ساختار، CI، توکن‌ها، موتور سطح دستگاه، رفع باگ‌ها

> **پرامپت خودکفا.** اول `prompts/00-MASTER.md` را بخوانید (مرجع بلامنازع).
> قوانین طلایی G1–G10 بر این فاز حاکم‌اند. خروجی این فاز، پایهٔ همهٔ فازهای بعد است —
> **اگر پایه کج باشد، بقیهٔ برنامه کج می‌شود.**

---

## ۱. مأموریت

ریپوی فعلی یک SPA خروجی Figma Make است با ۱۲ روت، بدون بک‌اند، با چند باگ و مقداری کد مرده.
این فاز آن را به یک **پلتفرم قابل ساخت** تبدیل می‌کند: ساختار درست، CI سبز،
سیستم توکن، موتور سطح دستگاه، پایهٔ i18n فارسی‌اول، و رفع همهٔ بدهی‌های فوری.

**در این فاز هیچ فیچری ساخته نمی‌شود.** فقط پایه.

---

## ۲. کارها

### ۲.۱ رفع بدهی‌های فوری (اجباری، قبل از هر چیز)

| # | کار | شواهد فعلی |
|---|---|---|
| 1 | **`/` باید به `/fa` برود، نه `/en`** | `src/app/App.tsx:85,87` |
| 2 | **تصمیم دربارهٔ ۵ کامپوننت مرده:** `ParticleField`, `SignalRouting`, `ResearchLab`, `Dashboard`, `Manifesto` — **احیا با هدف مشخص، یا حذف.** «ماندن شاید لازم شد» ممنوع (G7) | grep: used-in=0 |
| 3 | `package.json` نام `@figma/my-make-file` دارد → نام واقعی | `package.json:2` |
| 4 | **تصمیم دربارهٔ MUI + Emotion + react-popper:** سایت shadcn است. یا حذف کامل، یا ADR با توجیه. حذف ترجیح دارد (حجم نصب + ناسازگاری هویت) | `package.json` |
| 5 | `README.md` می‌گوید «سایت با زبان English باز می‌شود» → اصلاح به فارسی‌اول | `README.md` |
| 6 | حذف یا بایگانی `src/imports/pasted_text/` → انتقال به `docs/references/design-history/` | ۷ فایل، ۶۱۱۵ خط |

**خروجی:** یک کامیت با عنوان `chore(phase-0): resolve immediate debt` + فهرست تصمیم‌ها در گزارش فاز.

### ۲.۲ ساختار monorepo

```
web/                ← انتقال src/, index.html, vite.config.ts, postcss, tsconfig, package.json
api/                ← فقط اسکلت: README + .gitkeep (فاز ۱ آن را می‌سازد)
docs/               ← ساختار §۹ از MASTER
deploy/             ← اسکلت
prompts/            ← بدون تغییر
.github/workflows/
```

- ابزار monorepo: **pnpm workspace** (فایل `pnpm-workspace.yaml` از قبل در ریشه هست).
- مسیرهای مطلق با alias: `@/` → `web/src/`.
- **گیت:** انتقال با `git mv` انجام شود تا تاریخچه حفظ شود.

### ۲.۳ ساختار feature-based (ADR-005)

```
web/src/
├── features/            # ⭐ هر فیچر یک ماژول مستقل
│   ├── toolbox/         # ساختار آماده، خالی
│   ├── scanner/
│   ├── shell/
│   ├── assistant/
│   └── biolab/
├── visuals/             # ⭐ لایهٔ جسور (فاز ۴)
├── lib/
│   ├── device-tier.ts   # ⭐ ADR-006
│   ├── jalali.ts
│   ├── toman.ts
│   ├── api-client.ts
│   └── seo.tsx
├── content/             # محتوای fa-first تایپ‌شده
├── i18n/
└── components/          # فقط کامپوننت‌های مشترک و ui/
```

**قانون سخت:** هیچ `features/*` نباید از `features/*` دیگر import کند.
اشتراک از طریق `lib/` یا `components/`. این با یک rule در eslint enforce می‌شود.

### ۲.۴ Device Tier Engine (ADR-006) ⭐

این ماژول کوچک، **مجوز جسارت بصری** است. بدون آن، G2 اجرا نمی‌شود.

```ts
// web/src/lib/device-tier.ts
export type Tier = "full" | "balanced" | "low-power";
export function detectTier(): Tier;        // hardwareConcurrency + deviceMemory + reduced-motion
export function useTier(): { tier, override, setOverride };
```

- سه سطح دقیقاً طبق جدول §۵.۴ از MASTER.
- **کلید سراسری Low-Power در navbar** (G2 شرط ۴) + ذخیره در `localStorage`.
- **API برای مصرف‌کننده:** `useTier()` و یک `<TierGate full balanced>` برای شرطی‌سازی رندر.
- یک `<TierFallback>` که در `low-power` جایگزین استاتیک نشان می‌دهد.
- SSR-safe: در رندر اولیه همیشه `balanced` (تا hydration mismatch نشود)، سپس تشخیص.
- **تست:** هر سه سطح با mock کردن `navigator` + `matchMedia`.

### ۲.۵ سیستم توکن و جهت بصری جسور

**`docs/DESIGN.md` — بخش A: جهت بصری** (این یک تصمیم است، نه توصیف):

- **هویت:** سبز زمرد به‌عنوان لنگر برند حفظ می‌شود (از هویت فعلی).
  اما اجرا **جسور** است: کنتراست بالا، تایپوگرافی بزرگ و مطمئن، شبکهٔ آشکار،
  حرکت معنادار، و **یک امضای بصری** که در §۵.۴ MASTER تعریف شده.
- **تایپوگرافی:** جفت‌شدن Vazirmatn (فارسی) + یک فونت لاتین مهندسی.
  **ضریب‌های مخصوص فارسی** تعریف شود (Vazirmatn x-height کوچک‌تر است → اندازه/ارتفاع خط متفاوت).
- **توکن‌ها** در `web/src/styles/tokens.css` + نگاشت `@theme` در Tailwind 4:
  رنگ معنایی (bg/surface/text/line به ازای هر حالت بخش) · مقیاس زمرد ·
  **رنگ معنایی به ازای هر توان** (امنیت=سبزآبی سرد، AI=بنفش مهارشده، بیوتک=سبز زیستی،
  فرانت=زمرد، بک‌اند=آبی خاکستری) — این رنگ‌ها در ماتریس F-14 و در هر ابزار استفاده می‌شوند ·
  مقیاس نوع · فاصله ۴/۸ · شعاع · سایه (واقعی و نرم، نه glow پیش‌فرض) ·
  حرکت (fast/base/slow + easing) · **توکن‌های سطح دستگاه** (چگالی جلوه به ازای tier).
- **RTL:** همه‌چیز با logical properties. یک rule eslint برای ممنوعیت `left`/`right`/`ml-*`/`mr-*`.
- **واژگان حرکت:** فهرست مجاز (enter/exit/emphasis/transition) با مدت و easing مشخص.
  هر حرکت خارج از فهرست → نیاز به توجیه در DESIGN.md.
- **ممنوع:** glassmorphism بیش از حد، نئون بنفش، توپ نورانی، gradient رنگین‌کمانی،
  سایهٔ رنگی روی متن، انیمیشن بی‌دلیل.

**گیت:** یک اسکریپت که `tokens.css` را با استفادهٔ واقعی در کد مقایسه می‌کند —
توکن تعریف‌شدهٔ استفاده‌نشده = هشدار؛ رنگ hardcode شده = خطا.

### ۲.۶ پایهٔ i18n فارسی‌اول

- `LanguageProvider` با locale از مسیر: `/fa/*` پیش‌فرض، `/en/*` موازی.
- `t()` تایپ‌شده. **هیچ رشتهٔ خام در JSX.**
- `web/src/content/` به‌عنوان منبع حقیقت copy بازاریابی (fa-first).
- `lib/jalali.ts` و `lib/toman.ts` با **تست جامع** (این‌ها هستهٔ F-01 و F-03 هستند —
  الان ساخته و تست می‌شوند تا فاز ۲ فقط UI بنویسد).
- **`scripts/content-check.ts`**: بررسی برابری fa/en، خروجی جدولی، exit code. **این گیت CI است.**

### ۲.۷ SEO پایه + Static Bridge (ADR-003)

- `useSEO` با title/description/canonical/hreflang/robots/OG.
- `<JsonLd>` + Organization و WebSite پیش‌فرض.
- **اسکلت Static Bridge:** یک اسکریپت `render_public_html` که هر روت بازاریابی را در
  **CI** با puppeteer رندر می‌کند و HTML قابل crawl می‌سازد. در این فاز فقط **اسکلت** برای
  ۳ روت اصلی؛ گسترش در فازهای بعد.
- `sitemap.xml` و `robots.txt` تولیدشده.
- ⚠️ **قید cPanel:** headless browser **فقط در CI** اجرا می‌شود، هرگز روی سرور (§۵.۳).

### ۲.۸ CI

`.github/workflows/ci.yml` با jobهای:

```
web:  pnpm install → eslint → tsc --noEmit → vitest → content:check → vite build
      → bundle-budget → a11y (axe روی ۵ روت اصلی)
seo:  render_public_html → اعتبار meta/OG/hreflang/JSON-LD
sec:  npm audit (high/critical = fail) → secrets scan
```

- **`scripts/bundle-budget.ts`**: بودجهٔ لایه‌ای §۵.۴ را از خروجی `vite build --mode analyze`
  می‌خواند و در صورت تخلف **fail** می‌کند. در این فاز فقط روت‌های اصلی (≤ 200 KB gzip).
- همهٔ اسکریپت‌ها در `package.json` تعریف شوند: `lint`, `typecheck`, `test`,
  `content:check`, `budget`, `a11y`, `seo:render`.

### ۲.۹ ADRها

هشت ADR بنیادی در `docs/ADRS/` (فهرست در §۴ از MASTER). هرکدام:
زمینه · تصمیم · پیامدها · **الگوی کد** (برای ADR-003، 006، 008 این بخش اجباری است).

### ۲.۱۰ مستندات

`docs/DESIGN.md` (بخش A) · `docs/I18N.md` · `docs/CPANEL-PATTERNS.md` (اسکلت با الگوهای §۵.۳) ·
`docs/OPEN-ITEMS.md` (همهٔ `[INPUT Bx]`) · `README.md` بازنویسی‌شده، **فارسی اول**.

---

## ۳. ورودی‌های لازم

`B4` (نام برند + لوگو) — در غیابش، placeholder با مارکر.
بقیهٔ ورودی‌ها برای این فاز لازم نیستند.

---

## ۴. گیت‌های خروج (همه اجباری)

- [ ] `/` → `/fa`؛ سایت به‌صورت پیش‌فرض فارسی، RTL، با ارقام فارسی باز می‌شود.
- [ ] CI سبز روی همهٔ jobها.
- [ ] `content:check` کار می‌کند — **و با حذف عمدی یک کلید، شکست می‌خورد** (این را عمداً نشان دهید).
- [ ] `bundle-budget` کار می‌کند — **و با افزودن عمدی یک وابستگی سنگین، شکست می‌خورد.**
- [ ] Device Tier Engine هر سه سطح را درست تشخیص می‌دهد (تست) + کلید Low-Power در navbar کار می‌کند.
- [ ] صفر کامپوننت مرده (grep راستی‌آزمایی شود و خروجی در گزارش فاز بیاید).
- [ ] `three`/`fiber`/`drei` **در bundle اولیه نیستند** (خروجی `bundle-budget` به‌عنوان شاهد).
- [ ] هر ۸ ADR نوشته شده‌اند.
- [ ] `pnpm build` تمیز، بدون هشدار TS.
- [ ] axe-core روی ۵ روت اصلی تمیز (در هر دو زبان).
- [ ] `docs/OPEN-ITEMS.md` همهٔ `[INPUT Bx]`ها را دارد.

---

## ۵. گزارش فاز

در پایان: یک کامیت `chore(phase-0): …` + یک بخش در `CHANGELOG.md` + به‌روزرسانی
`docs/OPEN-ITEMS.md`. گزارش باید بگوید: **کدام گیت‌ها با چه شاهدی گذشتند** · انحراف‌ها ·
موارد باز · آنچه فاز ۱ می‌تواند به آن تکیه کند.

---

## ۶. آنچه فاز ۱ می‌تواند به آن تکیه کند

monorepo با `web/` و `api/` · CI با jobهای web/seo/sec · `lib/jalali.ts` و `lib/toman.ts`
تست‌شده · Device Tier Engine · سیستم توکن · اسکلت Static Bridge · ADR-001..008.

---

*فاز ۰ از بستهٔ v2 · ۲۰۲۶-۰۹-۲۳*
