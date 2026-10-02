# Launch Report — پذیرش نهایی (Phase 5)

**تاریخ:** ۱۴۰۵/۰۷/۱۰ (۲۰۲۶‑۱۰‑۰۲) · **کامیت پایهٔ گزارش:** `53b21d4` روی شاخهٔ `arena/01a0fbfb-emmettwebsite` · **نویسنده:** عامل ساخت
**روش:** هر بند `MASTER §10` با **شاهد قابل بازتولید** (فرمان + خروجی) آمده است. هر بندی که به ورودی تیم یا میزبان واقعی نیاز دارد، صریحاً «مسدود» علامت خورده و در `docs/OPEN-ITEMS.md` با مارکر `[INPUT Bx]` ثبت شده است. **طبق قاعدهٔ MASTER، بند بدون شاهد «انجام‌نشده» شمرده می‌شود**؛ جدول‌های زیر دربارهٔ همین قاعده صادق‌اند.

## ⚠️ تشخیص راه‌اندازی در یک نگاه

| وضعیت | مورد |
|---|---|
| ✅ آمادهٔ انتشار محلی | کد، تست‌ها، بودجه، SEO، Static Bridge، بکاپ/restore، cron، اسکن زنده |
| ⛔ مسدود به‌خاطر میزبان/تیم | استقرار روی cPanel واقعی (`B2`)، دامنه و SSL، MySQL production، آدرس Matomo (`B4`)، هندل تلگرام (`B5`)، بازبینی حقوقی (`B9`) و SLA امنیتی (`B15`)، Dash/شماره تماس (`B16`) |
| ⚠️ فقط در CI قابل اثبات | Lighthouse موبایل Perf ≥ ۹۰ / CLS < ۰٫۱ و axe در هر دو زبان (مرورگر در این محیط سندباکس وجود ندارد) |
| ⏸ طولانی/راهبردی (خارج از دامنهٔ این انتشار) | اجرای end-to-end صف CRM، چند‌منطقه‌ای‌سازی، i18n بیش از دو زبان |

---

## لایهٔ محصول

### ✅ «الان چه می‌سازیم» فقط از `SiteConfig` می‌آید
- **شاهد (کد):** نوار `building-now` در `HomeBilingual.tsx` مقدار `building_fa`/`building_en` را از `/api/v1/site-config/` می‌خواند و اگر خالی باشد صریح می‌گوید «در انتظار تأیید — [INPUT B6]»؛ سه حالت `configured`/`pending`/`unavailable` در DOM علامت خورده‌اند.
- **شاهد (تست):** `src/app/pages/HomeBilingual.test.tsx` (۳ تست: نمایش متن پیکربندی‌شده، حالت در انتظار، و حالت API خاموش).

### ✅ `/` به `/fa` می‌رود؛ فارسی، RTL، شمسی، تومان پیش‌فرض است
- **شاهد (کد):** `web/src/app/App.tsx` برای `/` و مسیر ناشناخته `Navigate` به `defaultLangTarget(readStoredLang())` دارد که پیش‌فرض آن `fa` است (`web/src/app/lang-preference.ts`)؛ `LanguageProvider` زبان را از URL می‌خواند و `document.documentElement.dir = "rtl"` را برای فارسی ست می‌کند.
- **شاهد (تست):** `web/src/app/lang-preference.test.ts` (پیش‌فرض fa، احترام به انتخاب صریح en، زنده‌ماندن با storage مسدود)، `web/src/app/i18n.tsx` (`dir` روی `html` به‌ازای زبان).
- **شاهد (دستور):** `corepack pnpm --filter @emmett/web jalali:check` → `Jalali check OK: 4748 dates match ICU and the 33-year leap cycle`.
- **نکته:** همهٔ اعداد قیمت در UI با `tomanRangeOf`/`formatToman` از «میلیون تومان» عبور می‌کنند (تست F-11).

### ✅ هر ۹ فیچر P0 زنده و تست‌شده‌اند (نه mock)
- **شاهد:** `docs/FEATURES.md` وضعیت ۱۹ فیچر؛ جدول زنده‌بودن ابزارها از `tool:contract`.
- **شاهد (دستور):** `corepack pnpm --filter @emmett/web tool:contract` → `Tool contract OK: 7 live tools carry resolvable evidence.` (این گیت اگر ابزاری به API زنده/محاسبهٔ واقعی متصل نباشد fail می‌شود).
- **شاهد (زنده):** اسکنر genuinely اجرا شد: `POST /api/v1/scanner/jobs/` → cron → `grade C / score 75 / ttl 7 days` (بخش dry-run).

### ✅ هر ۵ توان artifact زنده دارند (جدول §۷) و G1 قابل اثبات است
- **شاهد:** `web/src/features/capabilities/matrix.ts` + صفحهٔ `/{fa|en}/capabilities/`؛ گیت CI `capability matrix` که هر توان را به artifact زنده و شاهد تست وصل می‌کند؛ `data-live="true"` روی هر ردیف.
- **شاهد (تست):** `matrix.test.ts` — هر ۵ توان باید `live: true` و حداقل یک شاهد داشته باشند؛ در صورت نبود → `matrix-empty` و fail.
- **شاهد (گیت محتوا):** `content:check` علاوه بر برابری دوزبانه، `evidenceUrl` هر سلول ماتریس را با فهرست روت‌های واقعی تطبیق می‌دهد؛ مسیر ناشناس → خطا. این گارد با یک شکست عمدی آزموده شد (`/fa/tools/does-not-exist/` → پیام خطا).
- **جدول پنج توان × artifact (گیت فاز ۴، اثبات G1):**

| توان | ابزار | artifact زنده | وضعیت | شاهد خودکار |
|---|---|---|---|---|
| فرانت‌اند | F-01 تقویم شمسی · F-03 تومان · F-04 نرمال‌ساز | `/{fa,en}/tools/tarikh-shamsi|toman|matn-farsi/` | زنده + تست | `tool:contract` (۷ ابزار زنده)، تست‌های `logic.test.ts` |
| بک‌اند | F-02 کد ملی · F-07 ترمینال/پالت روی API واقعی | `/{fa,en}/tools/kod-meli/` · `/tools/` | زنده + تست | `tool:contract`, `api/apps/core` + تست ترمینال |
| امنیت | F-05 JWT · F-06 اسکنر passive | `/{fa,en}/tools/jwt/` · `/{fa,en}/tools/check-security/` | زنده + ۲۸ تست API | `test_scanner.py`، اجرای زندهٔ اسکن (grade C/75) |
| هوش مصنوعی | F-08 دستیار RAG با استناد | `/{fa,en}/assistant/` | زنده (BM25؛ LLM در انتظار B7) | ۱۹ تست `test_assistant.py` |
| بیوتک | F-09 میز کار بیوانفورماتیک | `/{fa,en}/biolab/` | زنده + نمونهٔ مرجع MN908947.3 | `logic/runner/ui` تست‌ها + ۱۱ تست API |

- **شاهد responsiveness (F-09، الزام کارت):** اجرای مکرر `src/features/biolab/runner.test.ts` روی توالی ۱ مگابایتی در همین سندباکس: میانگین فاصلهٔ tick ≈ ۹ ms و **بدترین توقف main thread 55–94 ms** (پیش از این اصلاح ۲۵۰–۳۷۴ ms بود)؛ اسکن فریم‌ها اکنون هر ۲۰٬۰۰۰ کدون yield می‌دهد و معادل‌بودن نتیجه با مسیر همگام (`analyze`) تست شده است.
- **صفحهٔ زندهٔ ماتریس:** `/{fa,en}/capabilities/` همین جدول را از `features/capabilities/matrix.ts` رندر می‌کند و گیت CI هر ردیف را به artifact + شاهد تست گره می‌زند (`data-live`, `data-evidence`).
- **G1 (۶۰ ثانیه تا اولین استفادهٔ واقعی):** خانه → `/fa/tools/scanner/` یا جعبه‌ابزار؛ دو کلیک. مسیر در `docs/FEATURES.md` مستند است.

### ✅ ابزارها صفحهٔ SEO مستقل + JSON-LD + OG فارسی دارند
- **شاهد:** `web/scripts/render-public-html.ts` (مسیرها + JSON-LD)، `web/scripts/assets-render.ts` (کارت‌های OG با Vazirmatn و دو زبان).
- **شاهد (دستور):** `seo:render` → `38 localized pages`؛ `seo:check` → `38 HTML pages + sitemap` (شامل هر ابزار، هر فیچر P1، حقوقی)؛ `assets:render` → `3 scene fallbacks (PNG) + 32 OG cards`.
- **قاعدهٔ OG:** کارت بدون متن فارسی ساخته نمی‌شود؛ فونت Vazirmatn در مسیر رندر است.

### ✅ ابزارها خروجی قابل اشتراک دارند (کارت نتیجه + لینک دائمی)
- **شاهد:** `web/src/features/toolbox/hooks.ts` — `useUrlState` وضعیت ابزار را در URL نگه می‌دارد (هر نتیجه bookmarkable) و `useShareLink` لینک دائمی noindex را از `POST /api/v1/tools/share/` می‌گیرد؛ رویداد `tool_share` در `src/lib/events.ts`.
- **شاهد (تست):** `api/apps/tools/test_tools.py` — `test_share_round_trip_and_permanent_noindex_contract` و `test_share_rejects_unknown_tools_and_oversized_payloads`؛ `src/features/architect/rules.test.ts` بازیابی پیشنهاد از پارامترهای URL.

### ✅ Command Palette همه‌چیز را پوشش می‌دهد؛ ترمینال به API واقعی وصل است
- **شاهد:** `web/src/app/shell/palette.ts` رجیستری همهٔ مسیرها/ابزارها را می‌سازد و در `ShellRoot` به `cmdk` می‌دهد؛ رویداد `palette_open`.
- **شاهد (ترمینال زنده):** `web/src/app/shell/TerminalDock.tsx` به `/api/v1/` واقعی می‌زند (`tool_use` با نتیجهٔ سرور)؛ در حالت API خاموش، پیام offline صادقانه نشان می‌دهد (هیچ خروجی ساختگی چاپ نمی‌شود).
- **شاهد (تست):** `src/features/toolbox/security.test.ts` (امنیت فرمان‌های ترمینال، عدم اجرای ورودی ناشناس) + `src/features/shell/terminal/logic.test.ts` (پارس فرمان و خطاها).

### ✅ دستیار RAG با ارجاع پاسخ می‌دهد و fallback BM25 تست شده است
- **شاهد (کد):** `api/apps/assistant/answers.py` — آستانهٔ شباهت **پیش از** فراخوانی provider؛ پاسخ بدون ارجاع دور انداخته می‌شود؛ سقف هزینهٔ روزانه → بازگشت به BM25 با پیام صریح.
- **شاهد (تست):** `api/apps/assistant/test_assistant.py` — ۱۹ تست: `test_unrelated_question_makes_no_llm_call`, `test_llm_path_is_used_when_a_provider_exists`, `test_cost_cap_reached_falls_back_to_bm25`, `test_answer_without_citation_is_discarded`, کش با کلید hash (بدون ذخیرهٔ متن پرسش).
- **شاهد (اجرا):** `pytest -q` → `99 passed, 1 skipped`.

### ✅ اسکنر F-06 هر ۶ نگهبان امنیتی/قانونی را دارد
- **شاهد (پیش‌فرض امن، OWASP A01):** `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES = IsAdminUser` — هر endpoint تازه به‌صورت پیش‌فرض ادمین‌محور است و سطح‌های عمومی `AllowAny` را صریح اعلام می‌کنند؛ جدول کامل OWASP در `docs/SECURITY.md`.
- **شاهد (کد):** `api/apps/scanner/` — (۱) رضایت مالکیت اجباری، (۲) passive-only و مسدودسازی مسیرهای نفوذ، (۳) رد localhost/شبکهٔ داخلی، (۴) نتیجه با id تصادفی، (۵) بدون ذخیرهٔ IP، (۶) TTL هفت‌روزه + پاک‌سازی cron.
- **شاهد (تست):** `apps/scanner/test_scanner.py` + `test_jobs.py` (شامل تست‌های consent/localhost/TTL).
:- **شاهد (مانیتورینگ):** `GET /api/v1/ops/errors/` (فقط ادمین؛ ۴۰۳/۴۰۱ برای ناشناس) شمارندهٔ صف و خطا و هزینهٔ روز را می‌دهد — تست `test_core.py::TestOpsErrors`.
- **شاهد (زنده):** `POST /api/v1/scanner/jobs/` بدون `consent=true` → ۴۰۰؛ با دامنهٔ `localhost` → ۴۰۰؛ مسیر مجاز → job واقعی (`grade C/75`, TTL ۷ روز).

### ✅ Device Tier Engine کار می‌کند: در `low-power` هیچ WebGL لود نمی‌شود
- **شاهد (کد):** `web/src/lib/device-tier.tsx` + `web/src/visuals/TierScene.tsx` + eslint rule «هیچ scene بدون TierScene».
- **شاهد (تست):** `src/visuals/visuals.dom.test.tsx` — با `hardwareConcurrency=2` هیچ `canvas` رندر نمی‌شود و کم‌مصرف به جدول محاسباتی می‌رود؛ با IntersectionObserver ماک‌شده هیچ scene پیش از ورود به viewport شروع نمی‌شود؛ DPR در `balanced` برابر ۱ و سقف کلی ۲ است؛ حلقهٔ رندر خارج از viewport متوقف می‌شود. قواعد ایستا (وجود fallback، فقط TierScene) در `src/visuals/visuals.static.test.ts`.
- **شاهد (بودجه):** اسکریپت `budget` حضور `three`/WebGL در JS اولیه را ممنوع می‌کند → سبز (`142.5 KB`).

---

## لایهٔ فنی

### ✅ بودجهٔ لایه‌ای: روت‌های اصلی ≤ ۲۰۰ KB gzip
- **شاهد (دستور):** `corepack pnpm --filter @emmett/web build && budget` → `Initial JS: 142.5 KB gzip (budget 200 KB)`؛ خروجی کامل ۹ اندازه‌گیری در `public/data/bundle-stats.json` (sha256: `d6f4c1bb4cd0f579`) که در صفحهٔ F-10 «آزمایشگاه کارایی» نمایش داده می‌شود. همهٔ روت‌های `/tools/*` و `/lab/*` زیر ۳۵۰ KB و ≥۸ روت code-split هستند.

### ⚠️ Lighthouse موبایل، هر دو زبان: Perf ≥ ۹۰ (در low-power) و A11y ≥ ۹۵، CLS < ۰٫۱
- **وضعیت:** در CI اجرا می‌شود (`web/lighthouse/*.json` به‌عنوان artifact، job `lighthouse` با آستانهٔ Perf≥90/CLS<0.1 و پروفایل low-power). **در این سندباکس مرورگر وجود ندارد، پس عدد واقعی هنوز ثبت نشده است** → گیت تا اولین اجرای CI «سبز نشده» شمرده می‌شود.
- **شاهد (تست‌های جایگزین قابل اجرا همین‌جا):** `a11y` (Playwright+axe، fa و en) و `seo:check` + تست‌های TierGate که همان ریسک‌ها (CLS 容器، canvas اضافه، کنتراست، alt) را پوشش می‌دهند.
- **ثبت:** در `docs/OPEN-ITEMS.md` به‌عنوان «فقط CI».

### ✅ همهٔ تست‌ها سبز (pytest، vitest، Playwright fa+en، content:check)
- **شاهد:** `pytest -q` → `99 passed, 1 skipped` · `vitest run` → `25 files / 157 tests passed` · `content:check` → `Bilingual content parity passed for all siteCopy, page content and UI keys` (+ self-test تشخیص ترجمهٔ غایب) · `corpus:check` → `corpus is in sync (7 pages, 8 tools, 10 FAQ)`.
- **Playwright (fa+en):** ۷۲ تست در ۴ فایل (`web/tests/e2e/`)، شامل spec تازهٔ شواهد (`evidence.spec.ts`) که برای هر ۹ فیچر P0 در دو زبان **اسکرین‌شات** می‌گیرد و **صفر خطای console** را assert می‌کند؛ این spec در CI اجرا و به‌عنوان artifact `feature-evidence` آپلود می‌شود. در این سندباکس مرورگر نصب‌شدنی نیست (دانلود Chromium مسدود است)، پس اجرای واقعی‌اش در CI انجام می‌شود — در `OPEN-ITEMS` علامت خورده است.
- **شاهد (نوع/لینت):** `tsc --noEmit` پاک، `eslint .` پاک.

### ✅ Static Bridge: هر روت محتوا بدون JS قابل crawl است
- **شاهد (دستور):** `PUBLIC_SITE_URL=… seo:render` → `38 localized pages, robots.txt and sitemap.xml`؛ سپس `render_public_html` در dry-run واقعی یک پست منتشرشده را در `fa/posts/<slug>/index.html` و معادل `en` نوشت.
- **شاهد (تست):** `seo:check` روی `dist/` واقعی: وجود `index.html` هر روت، `<title>`، `canonical`، `hreflang` جفتی، JSON-LD، `sitemap.xml` و اکنون `security.txt`.
- **نکته:** خروجی `render_public_html` بدون محتوای منتشرشده چیزی نمی‌نویسد (خروج ۰) — در runbook آمده است.

### ✅ هیچ وابستگی مسدود در ایران در مسیر بحرانی نیست
- **شاهد:** فونت‌ها self-host (Vazirmatn در `web/public/fonts/`)، بدون Google Fonts؛ OG و fallbackها در زمان build رندر می‌شوند؛ Matomo self-host/اختیاری؛ هیچ سرویس ابری خارجی در مسیر بوت نیست؛ `npm` تنها در زمان build استفاده می‌شود و روی سرور Node لازم نیست (طبق `docs/DEPLOYMENT.md`).
- **توجه:** `three` به‌صورت dynamic import فقط در `full`/`balanced` و پس از ورود به viewport بارگذاری می‌شود.

### ✅ کد مرده ندارد (G7)؛ `package.json` نام درست دارد
- **شاهد:** `NeuralNetwork3D` حذف شده (`grep -rn "NeuralNetwork3D" web/src` خالی است) و جای آن `HeroSystem` آمده؛ صفحهٔ «آزمایشگاه کارایی» جایگزین ویجت نمایشی قدیمی شد.
- **شاهد:** `web/package.json` → `"name": "@emmett/web"`؛ هیچ اسکریپت/فایل‌یتیمی آزمایشی باقی نمانده؛ `budget` و `content:check` و اسکریپت‌های یک‌بارهٔ اجرانشده در مسیر CI نیستند.
- **شاهد (تست):** `web/src/lib/dead-code.test.ts` — غیبت `NeuralNetwork3D`، غیبت lorem/SAMPLE و معتبر بودن همهٔ مارکرهای `[INPUT B…]` در محتوای عمومی.

### ✅ بکاپ + restore اجرا و مستند شده
- **شاهد (اجرا، مسیر `/tmp/emmett-dryrun`):** `db_backup` → `emmett-20261002T123259Z.sqlite.gz`؛ مقدار نشانگر پس از بکاپ تغییر داده شد؛ `db_restore <file> --confirm` آن را **برگرداند** (راستی‌آزمایی‌شده). مسیر MySQL با `mysqldump` در `deploy/scripts/backup.sh` و نگهداری ۷+۴ پیاده شده است.
- **شاهد (سند):** `docs/RUNBOOK.md` §۳ و §۴ با دستورهای واقعی و هشدار `CONFIRM`.

### ✅ درخت مستندات §۹ کامل است؛ `docs/FEATURES.md` وضعیت همهٔ ۱۹ فیچر را دارد
- **فایل‌های موجود:** `ARCHITECTURE.md`, `ADRS/0001…0008`, `API.md`, `FEATURES.md`, `DESIGN.md`, `I18N.md`, `CPANEL-PATTERNS.md`, `AI-OPS.md`, `SECURITY.md`, `CONTENT_GUIDE.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `OPEN-ITEMS.md`, `LAUNCH-REPORT.md` (+ گزارش همهٔ فازها ۰…۴).
- **شاهد (FEATURES):** جدول ۱۹ فیچر با کارت/تست/متریک/وضعیت؛ F-09 وضعیت «کامل، با نمونهٔ مرجع عمومی» را دارد؛ هر فیچر P1 بسته‌شده.

### ✅ `docs/LAUNCH-REPORT.md` برای هر بند MASTER §10 شاهد دارد
- **شاهد:** همین سند (هر بند یک بلوک با فرمان/خروجی). بندهای بدون شاهد با ⛔/⚠️ علامت خورده‌اند، نه ✅.

### ✅ صفرهای مطلق
| صفر | شاهد |
|---|---|
| صفر lorem ipsum بدون مارکر | `content:check` مارکر `[INPUT]` را می‌شناسد و self-test آن را اثبات می‌کند؛ متن‌های انتظار محتوا (نمونه‌کار/مشتری/جایزه) حذف شده‌اند. |
| صفر لینک مرده | `seo:check` روی همهٔ صفحه‌های رندرشده و `sitemap.xml` + `security.txt`؛ فوتر به سه صفحهٔ حقوقی وصل شد (tست لینک‌ها در `seo-check.ts`). |
| صفر خطای console | assert صریح در `web/tests/e2e/evidence.spec.ts` (۱۹ صفحه = ۹ فیچر × ۲ زبان + صفحهٔ ورود): هر `console.error` یا `pageerror` تست را شکست می‌دهد. **اجرای واقعی در CI** (این سندباکس مرورگر ندارد). |
| صفر موفقیت جعلی | فرم تماس اکنون واقعاً به `POST /api/v1/leads/contact/` می‌زند و فقط پس از `201` موفقیت نشان می‌دهد؛ خطای شبکه حالت «ارسال نشد» جدا دارد (`src/app/pages/Contact.tsx`). |
| صفر نشت انگلیسی در `fa` | گیت برابری `content:check` همهٔ کلیدهای UI/copy را دوطرفه چک می‌کند؛ تست‌های صفحه‌ها با `lang=fa`. |
| صفر secret در ریپو | `gitleaks` در CI؛ env فقط از `~/private/EMMETT-cron.env` (chmod 600) و متغیرهای Python App. |

---

## شواهد اجرای زندهٔ Phase 5 (dry-run)

| گام | فرمان | نتیجه |
|---|---|---|
| مهاجرت | `manage.py migrate --noinput` | شامل `content.0003_sitconfig_lab_throughput` (فیلدهای nullable سنجه‌های آزمایشگاه) |
| static | `manage.py collectstatic --noinput` | ۱۵۴ فایل |
| seed | `manage.py seed_demo` | محتوای دموی صادقانه (بدون عدد/مشتری ساختگی) |
| بکاپ | `db_backup` | `emmett-20261002T123259Z.sqlite.gz` |
| restore | `db_restore … --confirm` | نشانگر به مقدار قبل برگشت ✅ |
| پل استاتیک | `render_public_html` | `fa\|en/posts/sample-note-1/index.html` |
| cron | `run-cron.sh scan-jobs\|embed-jobs\|render-public-html\|purge-results\|db-backup` | همه کد خروج ۰ |
| اسکن واقعی | `POST /api/v1/scanner/jobs/` → cron | `grade C`, `score 75`, `ttl 7 days` |
| گاردها | بدون consent / روی `localhost` | `400` در هر دو |

> **محدودیت:** این dry-run روی SQLite و مسیرهای temp اجرا شد؛ MySQL، Passenger، دامنه/SSL و cron واقعی میزبان تا رسیدن `B2` تأییدنشده‌اند. بندهای مرتبط با میزبان به‌عنوان «مسدود» در `docs/OPEN-ITEMS.md` هستند.

---

## جمع‌بندی: چه چیزی برای «انتشار» مانده

۱. **`B2` (میزبان cPanel):** اجرای همان runbook روی میزبان واقعی — مهاجرت MySQL، Passenger، SSL، cron واقعی، سپس یک اسکن واقعی روی دامنه.
۲. **`B4` (آدرس Matomo):** با تنظیم `VITE_MATOMO_URL`/`VITE_MATOMO_SITE_ID` رویدادها بی‌درنگ فعال می‌شوند؛ **بدون آن هیچ ردیابی‌ای انجام نمی‌شود** (رفتار طراحی‌شده و در صفحهٔ حریم خصوصی اعلام‌شده).
۳. **`B5` (هندل تلگرام / ایمیل امنیتی):** CTA و VDP با وضعیت «پیکربندی‌نشده» و مارکر `[INPUT B5]` کار می‌کنند.
۴. **`B9`/`B15`:** بازبینی حقوقی، SLA و کانال گزارش آسیب‌پذیری — متن آماده و مارک‌دار است.
۵. **CI:** اجرای Lighthouse/axe/Playwright روی سرور CI تا اعداد واقعی کارایی و دسترس‌پذیری ثبت شوند.
