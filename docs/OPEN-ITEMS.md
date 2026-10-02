# موارد باز — ورودی‌های تیم

ورودی‌های ناموجود با قرارداد پروژه placeholder و ادامهٔ توسعه دارند؛ موارد محیطی قبل از انتشار باید تکمیل شوند.

| ID | مورد | وضعیت فعلی | نیاز بعدی |
|---|---|---|---|
| B1 | دامنهٔ اصلی/staging و DNS | باز؛ هنوز دامنه‌ای تأیید نشده | تعیین canonical، staging و DNS |
| B2 | میزبان cPanel و نسخه‌های Python/MySQL | باز؛ blocker استقرار، توسعه روی SQLite و Python 3.11 sandbox اعتبارسنجی شد | تأیید Python 3.12 و نسخه/دسترسی MariaDB/MySQL؛ اجرای restore/deploy روی staging |
| B3 | SMTP و ایمیل تیم | باز؛ dev با console backend؛ **فرم تماس زنده است**: `POST /api/v1/leads/contact/` رکورد می‌سازد و ایمیل را در outbox می‌گذارد، پس بدون SMTP ایمیل تأیید ارسال نمی‌شود | مقداردهی SMTP env و نشانی پشتیبانی |
| B4 | نام نهایی EN/FA و SVG لوگو | نام پیش‌فرض «Emmett» / «امت» استفاده شد؛ لوگوی نهایی داده نشده | تأیید نام/ارسال لوگو |
| B5 | کانال‌های تماس و Telegram handle | باز؛ API `telegram_handle=""` برمی‌گرداند و UI وضعیت صادقانهٔ «پیکربندی‌نشده» با `[INPUT B5]` نشان می‌دهد (بدون دکمهٔ فعال جعلی) | ایمیل، تلفن، آدرس، ساعت کار، شبکه‌ها، handle و **نشانی امنیتی برای `security.txt`/VDP** |
| B6 | محتوای واقعی تیم/کیس/توصیه‌نامه | باز؛ از ادعای نمونهٔ واقعی استفاده نشده | دادهٔ واقعی یا اجازهٔ sampleهای marked |
| B7 | LLM provider، کلید و بودجه | باز؛ F-08 با `NullProvider` و BM25 کامل ship شده و هیچ کلیدی در مخزن نیست | ثبت provider در env (ADR-007) + سقف روزانه؛ سپس `ASSISTANT_LLM_PROVIDER=relay|hosted` و اجرای `rebuild_assistant_corpus` |
| B8 | تأیید Matomo cookieless | باز؛ ردیاب **خاموش** است تا آدرس ندهید؛ با `VITE_MATOMO_URL` + `VITE_MATOMO_SITE_ID` روشن می‌شود؛ ۱۳ رویداد آماده و cookie-free (`disableCookies`/`setDoNotTrack`) | تأیید و آدرس self-hosted یا تصمیم عدم استفاده |
| B9 | متن حقوقی FA/EN | **متن کامل نوشته شد و منتشر است** (`/{fa,en}/privacy|terms|security/`)؛ بازبینی حقوقی انجام نشده و در صفحه با `[INPUT B9]` علامت خورده | بازبینی حقوقی و تأیید متن |
| B10 | دیتاست بیوتک | نمونهٔ عمومی **MN908947.3** (SARS-CoV-2 Wuhan-Hu-1، ۲۹٬۹۰۳ nt، منبع ENA) با ذکر منبع بارگذاری شده و در API نگه داشته می‌شود؛ هنوز تأیید صریح تیم برای مجموعهٔ گسترده‌تر نیست | تأیید دامنهٔ دیتاست عمومی مجاز برای D1 |
| B11 | GitHub org عمومی | باز | لینک org برای transparency |
| B12 | کیس‌استادی واقعی و metrics قابل استناد | باز؛ هیچ metric/customer ساخته نشده؛ از این رو گروه «کیس‌استادی‌ها» در palette تا ورود داده خالی می‌ماند | دست‌کم یک کیس‌استادی دارای permission و اعداد مستند |
| B13 | تعطیلات مذهبی (قمری) تقویم ۱۴۰۴–۱۴۰۶ | باز؛ فقط تعطیلات ثابت شمسی seed شده (نسخهٔ `solar-fixed-1404.1`) | دادهٔ تأییدشدهٔ تعطیلات قمری برای افزودن به همان مدل نسخه‌دار |
| B14 | لینک عمومی مستندات کورپوس RAG | باز؛ `docs/*.md` و ADRها در کورپوس هستند اما صفحهٔ عمومی ندارند، پس استنادشان فقط نام فایل است | انتشار Field Library (B6) یا افزودن URL عمومی تا استنادها لینک شوند |
| B15 | تأیید حقوقی متن رضایت اسکنر | باز؛ متن بر پایهٔ مادهٔ ۷۲۹ نوشته شده اما تأیید حقوقی نشده؛ سیاست افشای آسیب‌پذیری (VDP) منتشر شده و کانال اختصاصی + SLA هنوز با `[INPUT B15]` علامت خورده | بازبینی حقوقی متن disclaimer، شرایط استفاده و SLA افشا |

**هیچ credentialی را در Git وارد نکنید.** همهٔ تنظیمات خصوصی باید از env وارد شوند.

---

## یافته‌های dry-run استقرار (Phase 5)

اجرای کامل روی SQLite و مسیرهای موقت انجام شد. آنچه **بدون میزبان واقعی قابل بستن نیست**:

| مورد | یافته | اقدام لازم (وابسته به B2/B1) |
|---|---|---|
| MySQL/MariaDB | dry-run روی SQLite بود؛ مهاجرت‌ها DB-agnostic نوشته شده‌اند اما روی MySQL اجرا نشده‌اند | اجرای `migrate` روی MariaDB و بررسی اینتریکس/`utf8mb4` |
| Passenger | نقص واقعی پیدا و رفع شد: `api/emmett/wsgi.py` وجود نداشت و `passenger_wsgi.py` خطا می‌داد؛ اکنون entry point ساخته شد و تست دارد. روی میزبان واقعی هنوز اجرا نشده | ثبت Python App و مقداردهی `DJANGO_SETTINGS_MODULE`/env در پنل، سپس `python -c "import passenger_wsgi; print(passenger_wsgi.application)"` |
| cron واقعی | اسکریپت‌ها با env فایل واقعی اجرا شدند؛ خطوط `deploy/crontab.txt` هنوز در پنل ثبت نشده | افزودن ۹ خط cron پنل و بررسی لاگ اولین اجراها |
| static/DNS | توانایی سرو `web/dist` + `.well-known/security.txt` از پنل تأیید نشده | تنظیم MIME `.well-known`، انتقال `dist` و تست crawl |
| SMTP | outbox پر می‌شود اما بدون SMTP ایمیلی ارسال نمی‌شود | مقداردهی B3 و تست ارسال واقعی |
| بکاپ | `backup.sh`/`restore.sh` روی SQLite تست شد؛ مسیر `mysqldump` روی میزبان تأیید نشده | تست بکاپ/ریستور MySQL و ست‌کردن `BACKUP_DIR` بیرون از `public_html` |

## بررسی‌هایی که فقط در CI معنا دارند (بدون مرورگر در سندباکس)

| بررسی | جای اجرا | معیار |
|---|---|---|
| Lighthouse موبایل (fa/en) | job `lighthouse` در `.github/workflows/ci.yml`، پروفایل low-power | Perf ≥ ۹۰، CLS < ۰٫۱ (A11y ≥ ۹۵ توسط axe) |
| axe (serious/critical) | `web/tests/e2e/accessibility.spec.ts` (۱۳ روت × ۲ زبان) | صفر violation |
| Playwright tools/security | `web/tests/e2e/*.spec.ts` | سناریوهای ابزارها و گاردهای امنیتی |
| صفر خطای console | `web/tests/e2e/evidence.spec.ts` در همان اجرای Playwright (۱۹ صفحه) | هر `console.error`/`pageerror` → شکست؛ در سندباکس مرورگر نصب نمی‌شود (دانلود Chromium مسدود) |
| شواهد تصویری هر ۹ فیچر P0 | همان spec، artifact به نام `feature-evidence` در job `web` | یک PNG به‌ازای هر فیچر × زبان — الزام `prompts/07-PHASE-5-LAUNCH.md` §۱۰ |

> تا زمانی که این چهار مورد در CI سبز نشوند، بندهای مربوطه در `docs/LAUNCH-REPORT.md` با ⚠️ علامت خورده‌اند، نه ✅.
