# گزارش فاز ۳ — امنیت و هوش مصنوعی

**تاریخ:** ۱۴۰۵/۰۷/۱۰ (2026-10-02) · **وضعیت:** کامل (F-08 در حالت BM25، مطابق تصمیم B7)

## ترتیب اجرا (همان ترتیب اجباری پرامپت)

۱. نگهبان‌های F-06 → ۲. موتور اسکن روی job engine → ۳. UI/گزارش/CTA → ۴. تست‌های نگهبان (گیت سخت) →
۵. زیرساخت chunk/embed با cron → ۶. retrieval + آستانه → ۷. provider abstraction + polling →
۸. **BM25 قبل از provider** → ۹. اتصال `scan`/`ask` به ترمینال.

## F-06 — چک‌آپ امنیتی دامنه

| بخش | خروجی |
|---|---|
| نگهبان ۱ (passive) | `transport.py`: یک choke point؛ فقط ۸۰/۴۴۳؛ ریدایرکت دوباره validate می‌شود؛ DoH برای DNS و یک handshake TLS روی ۴۴۳ |
| نگهبان ۲ (consent) | disclaimer ثابت + تیک اجباری؛ `consent:false` → 400 |
| نگهبان ۳ (rate) | ۵/ساعت بر IP با پیام Fa/En + honeypot + تأخیر تصادفی |
| نگهبان ۴ (blocklist) | مدل نسخه‌دار + مهاجرت seed؛ بررسی پیش از ساخت job |
| نگهبان ۵ (unattributable) | `result_id` تصادفی، بدون IP، TTL ۷ روز، cron پاک‌سازی، `noindex` |
| نگهبان ۶ (mask) | `public_sections` نسخه‌ها را ماسک می‌کند؛ جزئیات کامل با توکن امضاشده |
| موتور | دامنهٔ کنترل‌شده در تست: شش بخش + گرید (نمونهٔ واقعی: `nginx/1.24.0` بدون HSTS → گرید E/۵۷) |
| UI | `/fa/tools/check-security/`، پیشرفت مرحله‌ای با polling، لینک دائمی، CTA PenTestor با `trackEvent` |
| degraded | صف شلوغ → پیام صادقانه + نتایج نمونه؛ شکست یک گام → همان بخش «بررسی‌نشده» |

**۲۸ تست API** و ۶ تست کلاینت + اسپک e2e؛ شواهد در `docs/SECURITY.md`.

## F-08 — دستیار RAG

- **کورپوس:** ۱۳۸ chunk از محتوای همین مخزن (کپی صفحات، توضیح هفت ابزار، ۱۰ FAQ با برچسب `[INPUT]`، مستندات و ADRها، کاتالوگ ابزار). صفر داده ساختگی.
- **BM25 اول:** جست‌وجوی متنی خالص پایتون با آستانهٔ امتیاز **و** پوشش واژه‌ها؛ تست‌های اجباری ۳ و ۴ سبز.
- **آستانه پیش از LLM:** spy اثبات می‌کند پرسش بی‌ربط («دستور پخت کیک») هیچ فراخوانی مدلی ندارد.
- **فیلتر خروجی:** پاسخ بدون `[n]` دور ریخته می‌شود → BM25 صادقانه (تست ۷).
- **provider:** `NullProvider` (پیش‌فرض) · `HttpRelayProvider` · `HostedProvider`؛ انتخاب از env، بدون کلید در مخزن. B7 در OPEN-ITEMS.
- **حریم خصوصی:** متن پرسش در `Job.payload` نمی‌ماند؛ کش با hash نرمال‌شده؛ فیدبک فقط بولین؛ ۲۰/ساعت؛ ≤۵۰۰ کاراکتر.
- **UI:** صفحهٔ `/fa/assistant/` + ویجت شناور + چیپ‌های منبع + «چه چیزی پیدا شد؟» (Show Your Work) + اعلام AI در هر پاسخ.
- **زیرساخت:** `sync_corpus` hash-based (تست ۹: بدون تغییر → صفر embedding)، job `embed` روی cron، `rebuild_assistant_corpus`.

## اتصال ترمینال

- `scan <domain>` بدون `--consent` → پیام رضایت (نگهبان ۲ روی مسیر دوم هم فعال است)؛ با تأیید → `POST /scanner/jobs/` و نمایش job_id و مسیر polling.
- `ask <question>` → `POST /assistant/ask/` + poll و نمایش پاسخ با mode و ارجاع‌ها.
- اسپک e2e برای هر دو مسیر (CI).

## گیت‌های خروج §۷

- [x] هر شش نگهبان پیاده و تست‌شده
- [x] اسکن واقعاً کار می‌کند و گرید می‌دهد (نمونهٔ اجرای واقعی در همین گزارش)
- [x] تست‌های نگهبان ۱، ۴، ۶، ۸ سبز (گیت سخت)
- [x] کارت/لینک اشتراکی دائمی `noindex` + TTL ۷ روز
- [x] CTA با رویداد Matomo (`trackGoal("scan_report_cta")`)
- [x] حالت degraded تست‌شده
- [x] **BM25 قبل از provider** ساخته و تست شده (ترتیب §۳.۴)
- [x] آستانهٔ شباهت پیش از LLM (تست ۲)
- [x] فیلتر خروجی (تست ۷)
- [x] سقف هزینه → BM25 نه خطا (تست ۴)
- [x] عدم لاگ متن پرسش (تست ۱۰)
- [x] `docs/AI-OPS.md` نوشته شد
- [x] ترمینال `scan`/`ask` وصل و e2e شده
- [x] `docs/SECURITY.md` و `docs/FEATURES.md` به‌روزرسانی شدند

## محدودیت‌های صادقانه

- **B7 باز است**: provider مدل زبانی فعال نیست؛ F-08 در حالت BM25 ship شده. با تنظیم env و یک `rebuild_assistant_corpus` فعال می‌شود، بدون تغییر کد.
- **استناد مستندات فقط نام فایل است** (B14): `docs/*.md` و ADRها صفحهٔ عمومی ندارند.
- **تأیید حقوقی متن رضایت** انجام نشده (B15).
- e2e/axe در CI اجرا می‌شوند؛ Chromium در این sandbox نصب نمی‌شود.
- `tool:contract:live` به `PUBLIC_SITE_URL` استقرار یافته نیاز دارد و در sandbox اجرا نمی‌شود.

## شواهد عددی

- `pytest` → **۸۱ passed، ۱ skipped** (۲۸ اسکنر + ۱۹ دستیار + بقیه)
- `vitest` → **۸۴ passed** در ۱۲ فایل (شامل `scanner/logic.test.ts` و `assistant/logic.test.ts`)
- `tsc --noEmit` → clean · `ruff check apps emmett manage.py` → clean
- `content:check` + `corpus:check` + `jalali:check` + `tool:contract` → pass
- `seo:render` → ۲۴ صفحهٔ استاتیک؛ `seo:check` → pass
- `budget` → initial **۱۲۳.۴ KB** gzip؛ هر روت (۶ ابزار + assistant) بین ۱۵۶–۱۶۰ KB (سقف ۳۵۰)
- `spectacular --validate --fail-on-warn` → clean · `makemigrations --check` → clean
