# گزارش فاز ۴ — بیوتکنولوژی و لایهٔ بصری جسور

**تاریخ:** ۱۴۰۵/۰۷/۱۰ (2026-10-02) · **وضعیت:** کامل، با یک شاهد CI-only (Lighthouse) که در `docs/OPEN-ITEMS.md` ثبت شده است.

## ۱. F-09 — میز کار بیوانفورماتیک

مسیر: `/fa/biolab/` و `/en/biolab/` (canonical با override مسیر، مطابق کارت F-09؛ `/tools/<slug>` به همان مسیر redirect می‌شود).

### چهار تب

| تب | وضعیت | شاهد |
|---|---|---|
| تحلیل توالی | زنده | `AnalysisTab.tsx` + `SequenceViewer.tsx` (سه حالت) + خروجی JSON/CSV + لینک اشتراک |
| تبدیل و ابزارها | زنده | `ConvertTab.tsx`: مکمل معکوس، رونویسی، ترجمه (سه قاب + جدول کد ژنتیکی)، قالب‌بندی FASTA |
| خط لولهٔ آزمایشگاه | زنده، بدون عدد ساختگی | `PipelineTab.tsx`: اعداد از `SiteConfig`؛ در نبود مقدار، وضعیت «تنظیم‌نشده» با مارکر `[INPUT B10]` |
| FHIR نمونه | زنده، فقط داده ساختگی | `FhirTab.tsx` + `fhir.ts`: Patient/Observation/Encounter از نتیجهٔ تحلیل همین صفحه + اعتبارسنجی ساختاری محلی |

### هستهٔ سمت کلاینت

- `web/src/features/biolab/logic.ts` — خالص و بدون DOM: `sanitizeInput`، `parseFasta`، `composition`/`gcPercent`/`gcSkew`، `molecularWeightDa`، `meltingTemperature` (روش Wallace برای ≤۱۴ nt، فرمول GC برای بقیه — روش در UI اعلام می‌شود)، `complement`/`reverseComplement`/`transcribe`، `translate`، `findOrfs`، `gcWindows`/`gcRichRegions`/`gcTrack`، `codonUsage`، `formatFasta`، `toCsv`، و generatorهای `resolveAnalysisOptions`/`createAnalysisRun`/`analyze`.
- `runner.ts` — اجرای تحلیل در **Web Worker** (`worker.ts`) و در نبود Worker، مسیر **chunked** روی main thread با yield بین مراحل؛ خروجی هر دو مسیر یکسان است و مسیر اجراشده در UI نمایش داده می‌شود.
- `runner.test.ts` — توالی ۱ مگابایتی روی مسیر chunked (اندازه‌گیری چاپ‌شده در خروجی تست): کل تحلیل **۳۶۶ ms** و بلندترین وقفهٔ main thread **۱۵۱ ms** (assert: < ۲۵۰ ms). عدد بین اجراها کمی تغییر می‌کند؛ سقف، معیار است.
- `logic.test.ts` (۱۷ تست) — از جمله نمونهٔ مرجع عمومی: spike CDS ویروس SARS-CoV-2 از `MN908947.3` با طول ۳۸۲۲ nt، GC ۳۷.۳۱٪، ۱۲۷۳ آمینواسید، محل برش فورین `PRRAR`، و نشانگرهای D614/N501.

### نگهبان‌ها (همه تست‌شده)

| نگهبان | اجرا | شاهد |
|---|---|---|
| disclaimer پژوهشی/آموزشی | متن ثابت در DOM + در `meta.ts` برای موتور جست‌وجو | `AnalysisTab.tsx` و «تست‌های UI» زیر |
| اعتبارسنجی آپلود | پسوند `fasta/fa/txt` + سقف ۱ مگابایت + فقط `ACGTN` و سرخط FASTA | `logic.ts:sanitizeInput` + تست‌های ۱ و ۲ |
| عدم لاگ توالی | منطق هیچ `console`/`fetch` ندارد؛ API هم توالی را لاگ نمی‌کند | تست API «هیچ لاگ/ذخیره‌ای» |
| رد دادهٔ بیمار | هشدار صریح UI + رد در سرور (کد ۴۰۰) | تست API نگهبان بیمار |
| کار با API خاموش | همهٔ محاسبات محلی است؛ فقط لینک اشتراک و اعداد آزمایشگاه از API می‌آید و در نبودش صادقانه پیام می‌دهد | تست UI «حالت API خاموش» |

### سه حالت نمایشگر (بند §۲.۲)

| tier | رفتار | شاهد |
|---|---|---|
| `full` | بوم تعاملی با zoom/pan، DPR ≤ ۲ | `SequenceViewer.tsx` + تست DPR |
| `balanced` | همان بوم، DPR = ۱، ارتفاع کوتاه‌تر | تست DPR = ۱ |
| `low-power` | **صفر canvas**؛ `SequenceTable` همان داده را جدولی می‌دهد | تست «low-power → جدول» |

بوم خارج از viewport رندر را متوقف می‌کند (`data-viewer-active`) و با `IntersectionObserver` شرطی می‌شود.

## ۲. لایهٔ بصری

```text
web/src/visuals/
├── TierScene.tsx          # wrapper اجباری
├── registry.ts            # فهرست صحنه‌ها + fallback و minTier هر کدام
├── primitives/            # capabilities.ts (پنج توان و یال‌ها)، scene-runtime.ts (DPR/فریم/loop)
├── scenes/                # HeroSystem/ · SignalFlow/ · DataLattice/ (همه dynamic import)
└── fallbacks/             # <Name>Static.tsx + <name>.svg از پیش رندر (CI برای PNG)
```

### هفت قانون سخت — شاهد هر کدام

| # | قانون | شاهد |
|---|---|---|
| ۱ | `three`/`fiber`/`drei` هرگز در bundle اولیه | وابستگی `three` **کامل حذف شد**؛ `bundle-budget` وجود `WebGLRenderer`/`three.module` را در همهٔ chunkها ممنوع می‌کند؛ `visuals.static.test.ts` هر import سه‌بعدی را رد می‌کند |
| ۲ | fallback از پیش رندر برای هر صحنه | `fallbacks/<name>.svg` + `<Name>Static.tsx` + تولید PNG در `scripts/render-assets.ts`؛ تست وجود فایل برای هر سه صحنه |
| ۳ | هیچ صحنه‌ای قبل از viewport شروع نمی‌شود | `visuals.dom.test.tsx` با IntersectionObserver ماک: قبل از ورود، نه canvas و نه fallback — فقط placeholder؛ سپس صحنه mount می‌شود |
| ۴ | DPR ≤ ۲ و = ۱ در `balanced` | تست: `devicePixelRatio=3` → عرض canvas ۸۰۰ برای ۴۰۰ پیکسل CSS؛ در `balanced` → ۴۰۰ |
| ۵ | در `low-power` صفر WebGL/canvas | تست با `hardwareConcurrency=2` و tier اجباری: هیچ canvas در DOM نیست و fallback معنادار (لینک‌های زندهٔ توان‌ها) رندر می‌شود |
| ۶ | انیمیشن ابعاد ظرف را تغییر نمی‌دهد | ارتفاع ثابت prop + `contain: layout paint`؛ تست: `style.cssText` قبل و بعد از اجرای چند فریم یکسان است |
| ۷ | خارج از viewport حلقهٔ رندر متوقف می‌شود | تست با RAF قابل cancel: پس از trigger خروج، شمارندهٔ فریم بوم ثابت می‌ماند و صف RAF صفر می‌شود |

enforcement اضافه: قاعدهٔ eslint `no-restricted-imports` روی `@/visuals/scenes/*` و `three` — خودآزمون: یک فایل موقت با این دو import، هر دو خطا را گرفت (شاهد اجرا در گزارش گیت‌ها).

### صحنهٔ امضا (`HeroSystem`)

- گره‌ها = **پنج توان تیم**؛ یال‌ها = شکل ترکیب آن‌ها (`CAPABILITY_EDGES` با دلیل دوزبانه).
- هر گره یک `<Link>` واقعی به artifact زندهٔ همان توان است: فرانت‌اند → ابزارهای محلی، بک‌اند → ابزار زندهٔ job-based، امنیت → چک‌آپ دامنه، هوش مصنوعی → دستیار، بیوتکنولوژی → بیولب.
- تست `visuals.static.test.ts` هر گره را به ورودی registry با `evidenceUrl` معتبر گره می‌زند؛ اگر یک ابزار از کار بیفتد، تست می‌شکند.
- `NeuralNetwork3D.tsx` قدیمی **حذف شد** (G7)، همراه با `Hero.tsx` و کل کامپوننت‌های مردهٔ قالب.

### بهداشت باندل (فاز ۴)

- حذف کامل وابستگی `three` + `@types/three`.
- حذف ۴۷ کامپوننت shadcn بلااستفاده و ۴۳ وابستگی npm بدون مصرف (radix، recharts، sonner، react-dnd و…). `pnpm-lock.yaml` کوچک‌تر و سطح audit باریک‌تر شد.

## ۳. گیت‌ها — شاهد اجرا

| گیت | فرمان | نتیجه |
|---|---|---|
| تست‌های وب | `pnpm exec vitest run` | **۱۱۳ تست / ۱۶ فایل سبز** (شامل ۱۱ تست لایهٔ بصری و ۲۰ تست F-09) |
| typecheck | `pnpm exec tsc --noEmit` | پاک |
| lint | `pnpm exec eslint .` | پاک |
| باندل | `pnpm run build && pnpm run budget` | Initial **۱۳۱.۶ KB gzip** ≤ ۲۰۰ · همهٔ روت‌های ابزار ≤ ۳۵۰ |
| خودآزمون بودجه | `pnpm run budget -- --self-test` | ۲۰۱.۱ KB ساختگی به‌درستی رد شد |
| Static Bridge/SEO | `PUBLIC_SITE_URL=… pnpm run seo:render && pnpm run seo:check` | **۲۶ صفحه** + sitemap + robots، همهٔ توکن‌های SEO سبز |
| قرارداد ابزار | `pnpm run tool:contract` | ۷ ابزار زنده با evidenceUrl معتبر |
| محتوا | `pnpm run content:check` (+`--self-test`) | parity دوزبانه سبز |
| کورپوس دستیار | `pnpm run corpus:export && pnpm run corpus:check` | به‌روزرسانی و سبز |
| API | `pytest -q` | **۹۴ passed / ۱ skipped** |

**CI-only (در sandbox قابل اجرا نیست):** axe/Playwright و Lighthouse. جاب `lighthouse` به CI اضافه شد (`web/lighthouserc.cjs`، حالت `low-power` با `puppeteerScript`) با آستانهٔ Perf ≥ ۰.۹۰، a11y ≥ ۰.۹۵، CLS < ۰.۱ و صفر خطای console. نبود مرورگر در sandbox قبلاً هم مستند شده بود؛ این مورد در `docs/OPEN-ITEMS.md` به‌عنوان «شاهد CI» ثبت است.

## ۴. جدول پنج توان × artifact زنده (گیت الزامی §۶)

| توان | artifact | مسیر زنده | وضعیت |
|---|---|---|---|
| فرانت‌اند | F-01 تقویم شمسی · F-03 فرمت‌کنندهٔ تومان · F-04 نرمال‌ساز فارسی | `/fa/tools/tarikh-shamsi/` · `/fa/tools/toman/` · `/fa/tools/matn-farsi/` | زنده + تست |
| بک‌اند | F-02 اعتبارسنج کد ملی (مسیر API عمومی) · F-07 ترمینال/پالت روی API واقعی | `/fa/tools/kod-meli/` · `/fa/tools/` (ترمینال `status`/`tools`) | زنده + تست |
| امنیت | F-05 دیباگر JWT · F-06 چک‌آپ امنیتی دامنه | `/fa/tools/jwt/` · `/fa/tools/check-security/` | زنده + ۲۸ تست API |
| هوش مصنوعی | F-08 دستیار RAG با استناد | `/fa/assistant/` | زنده (BM25؛ LLM در انتظار B7) |
| بیوتکنولوژی | F-09 میز کار بیوانفورماتیک | `/fa/biolab/` | زنده + ۲۰ تست وب و ۱۱ تست API |

هر ردیف به صفحه‌ای اشاره می‌کند که در `registry.ts` با `evidenceUrl` ثبت و توسط `tool:contract` بررسی می‌شود. خانهٔ بی‌شاهد وجود ندارد.

## ۵. تصمیم‌ها و موارد باز این فاز

- اعداد خط لولهٔ آزمایشگاه **ساختگی نیست**: فیلدهای `SiteConfig` اضافه شدند؛ تا ورود دادهٔ واقعی، تب وضعیت «تنظیم‌نشده» با مارکر `[INPUT B10]` نشان می‌دهد.
- دادهٔ مرجع F-09: توالی عمومی `MN908947.3` (SARS-CoV-2 Wuhan-Hu-1) از ENA با ذکر منبع؛ `[INPUT B10]` برای جایگزینی با دیتاست مورد تأیید تیم.
- fallback صحنه‌ها **معنادار** است: همان پنج گره و همان لینک‌های زنده، بدون canvas.
- Lighthouse و axe فقط در CI قابل اندازه‌گیری‌اند؛ در `docs/OPEN-ITEMS.md` با وضعیت «شاهد CI، اجرای محلی ناممکن» ثبت شده تا به‌عنوان انجام‌شده ادعا نشود.
