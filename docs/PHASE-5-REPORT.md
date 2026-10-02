# گزارش فاز ۵ — لانچ، محتوای واقعی، عملیات

**شاخه:** `arena/01a0fbfb-emmettwebsite` · **پیش‌نیاز:** فاز ۴ بسته (گزارش: `docs/PHASE-4-REPORT.md`)
**گیت خروج:** `prompts/00-MASTER.md` §۱۰ بند‌به‌بند با شاهد → `docs/LAUNCH-REPORT.md`

---

## ۱. چه ساخته شد

| مورد | نتیجه |
|---|---|
| محتوای دوزبانهٔ واقعی | کپی صادقانه و بدون عدد/مشتری/جایزهٔ ساختگی؛ همهٔ جاهای خالی با «در انتظار محتوا» و مارکر `[INPUT Bx]` علامت خورده |
| F-10 آزمایشگاه کارایی | `/fa|en/lab/performance/` — کارت Device Tier، vitals واقعی، نمودار FPS (full/balanced) و جدول در low-power، آمار باندل از artifact واقعی CI |
| F-11 مشاور معماری | `/fa|en/architect/` — گراف قواعد، دیاگرام SVG، بازهٔ هزینه/تیم نسخه‌دار، اشتراک‌پذیری از URL |
| F-13 تلگرام | `TelegramCta` + `buildTelegramLink` با UTM دوزبانه؛ تا `B5` وضعیت صادقانهٔ «پیکربندی‌نشده» (بدون لینک جعلی) |
| F-14 ماتریس توان | `/fa|en/capabilities/` — هر پنج توان با artifact زنده و شاهد؛ گیت CI مانع ردیف بی‌شاهد |
| F-12 OWASP زنده | **ساخته نشد، با دلیل مستند** (نیازمند sandbox ایزوله؛ جایگزین: F-06 + صفحهٔ امنیت) |
| SEO نهایی | `render-public-html` = ۳۸ صفحهٔ دوزبانه، JSON-LD کامل (`Organization`/`WebSite`/`SoftwareApplication`/`HowTo`/`ItemList`/`WebPage`/`BreadcrumbList`) + `BlogPosting` در پل پست‌ها، hreflang دوطرفه با `x-default`، sitemap، robots، **`/.well-known/security.txt`**، ۴۰ کارت OG (۱۵ روت × ۲ زبان؛ شامل کارت پست‌ها برای پل جنگو) و ۳ fallback صحنه؛ `seo:check` قرارداد نوع‌ها را اجباری می‌کند |
| حقوقی | `/fa|en/{privacy,terms,security}/` + لینک فوتر + `pending` با `[INPUT B9]`/`[INPUT B15]`/`[INPUT B5]` در DOM |
| Matomo | ۱۳ رویداد نام‌دار و cookieless؛ ردیاب فقط با `VITE_MATOMO_URL`+`VITE_MATOMO_SITE_ID` روشن می‌شود (پیش‌فرض خاموش) |
| سخت‌سازی | پیش‌فرض امن DRF (`IsAdminUser`)، شمارندهٔ خطای ادمین‌محور `ops/errors`، جدول OWASP در `SECURITY.md`، honeypot/تشخیص ایمیل جعلی، `security.txt`، هدرهای امنیتی + CSP/`Referrer-Policy`، اسکنر passive + رضایت + TTL، بدون لاگ توالی/توکن |
| عملیات | `db_backup`/`db_restore` (با `CONFIRM`)، cron ۹ وظیفه‌ای، `run-cron.sh` با env بیرونی، `docs/RUNBOOK.md` + `docs/DEPLOYMENT.md` |
| لایهٔ بصری | `HeroSystem` جای `NeuralNetwork3D` (حذف‌شده، تست `dead-code.test.ts`)؛ گراف پنج توان با کلیک به artifact زنده |

## ۲. اعداد این فاز

| سنجه | مقدار |
|---|---|
| تست‌های وب (vitest) | **۲۵ فایل / ۱۵۷ تست، همه سبز** |
| تست‌های API (pytest) | **۱۰۰ passed, 1 skipped** |
| بودجهٔ JS اولیه | **۱۴۲.۵ KB gzip** (سقف ۲۰۰)؛ artifact: `public/data/bundle-stats.json` (sha256 `d6f4c1bb4cd0f579`) |
| صفحه‌های Static Bridge | **۳۸ صفحهٔ دوزبانه** + sitemap + robots + security.txt |
| قرارداد ابزار | ۷ ابزار زنده با شاهد قابل‌حل |
| جلالی | ۴۷۴۸ تاریخ با ICU و چرخهٔ ۳۳ ساله |
| تست‌های Playwright | ۷۲ تست در ۴ فایل (دو فایل موجود + spec شواهد تازه) |

## ۳. dry-run استقرار (اجرای واقعی، محیط موقت)

`migrate` → `collectstatic` (۱۵۴ فایل) → `seed_demo` → `db_backup` → تغییر مقدار → `db_restore --confirm` (بازگشت تأییدشده) → `render_public_html` (پل استاتیک پست منتشرشده) → cron: `scan-jobs`، `embed-jobs`، `render-public-html`، `purge-results`، `db-backup` (همه کد خروج ۰) → اسکن واقعی از API: `grade C`, `score 75`, `ttl 7`.
گاردها: بدون رضایت → ۴۰۰، دامنهٔ داخلی/localhost → ۴۰۰.

### نقصی که dry-run اولیه ندید و در این دور پیدا و رفع شد
`runserver`/Passenger بالا نمی‌آمد چون `api/emmett/wsgi.py` وجود نداشت و هر دو ارجاع (`WSGI_APPLICATION` و `api/passenger_wsgi.py`) به آن اشاره می‌کردند. dry-run قبلی فقط دستورهای مدیریتی را اجرا کرده بود و این مسیر را لمس نکرده بود. اکنون:
- `api/emmett/wsgi.py` + `api/emmett/__init__.py` ساخته شد؛
- `api/passenger_wsgi.py` به یک re-export نازک تبدیل شد (تا با `deploy/passenger_wsgi.py` یکی بماند)؛
- تست `test_wsgi_entry_points_resolve` هر سه مسیر (settings → emmett.wsgi → passenger_wsgi) را یکسان بودن application بررسی می‌کند؛
- در همین جلسه API و وب هر دو بالا آمدند و `/api/v1/health/`، `/api/v1/site-config/` و `/fa/tools/` پاسخ ۲۰۰ دادند.

## ۴. چه چیزی باز مانده (و چرا)

- **`B2` میزبان واقعی:** MySQL/MariaDB، Passenger، دامنه/SSL، cron پنل — جزئیات در `docs/OPEN-ITEMS.md` بخش dry-run.
- **`B5` هندل تلگرام + نشانی امنیتی:** UI/VDP با وضعیت «پیکربندی‌نشده» کار می‌کنند.
- **`B9`/`B15` بازبینی حقوقی:** متن منتشر شده و صریحاً «تأییدنشده» علامت خورده.
- **پاسخ‌گویی F-09:** با chunking ریزتر (yield هر ۲۰٬۰۰۰ کدون + GC-track و رشتهٔ مکمل تکه‌تکه) بدترین توقف main thread از ~۳۷۴ ms به **۵۵–۹۴ ms** رسید؛ تست با سقف مطلق ۲۵۰ ms و نگهبان نسبت به ریتم ماشین، مقاوم به بار CI شد.
- **`B4` آدرس Matomo:** ردیاب خاموش؛ با یک متغیر محیطی فعال می‌شود.
- **سنجیده‌شده (نه CI-only):** با `web/scripts/local-browser.mjs` (Chrome for Testing ۱۵۳، هم‌نسخه با `playwright-core`، از npm به‌جای CDN مسدود) این سه گیت محلی هم اجرا شدند: Lighthouse → ۶ روت ×۲ اجرا با Perf ۰٫۹۹ / A11y ۱٫۰۰ / CLS ≤ ۰٫۰۱۰۵ / صفر خطای console؛ axe → ۵۰ صفحه (۲۵ روت ×۲ زبان) صفر violation؛ شواهد تصویری → `evidence.spec.ts` ۱۹ تست سبز و ۱۸ PNG در `web/test-results/evidence/`. اعداد و روش بازتولید در `docs/LAUNCH-REPORT.md`؛ CI همان گیت‌ها را روی بیلد خودش دوباره اجرا می‌کند.

## ۵. قضاوت صادقانه دربارهٔ آمادگی لانچ

**بدون `B2` هیچ انتشار واقعی‌ای رخ نداده است.** کد و عملیات محلی سبز است، ولی ادعای «زنده روی اینترنت» تا اجرای همان runbook روی میزبان، فقط یک برنامه است. اگر میزبان فردا آماده شود، مسیر لازم همین است: `docs/DEPLOYMENT.md` (§ شاهد dry-run) و سپس چک‌لیست پیش از انتشار در `docs/RUNBOOK.md` §۷. سه مورد باقی‌ماندهٔ محتوایی (`B5`, `B9`, `B15`) روی سایت «در انتظار تأیید» نشان داده می‌شوند، نه ادعای تأییدشده.
