# پذیرش استقرار روی Staging / Addon Domain

این سند دروازهٔ پذیرش **پیش از اعلام آمادگی Production** است. اجرای CI محلی/موقت جای آزمایش روی Addon Domain واقعی با Passenger، HTTPS، MySQL، Node و مسیرهای همان نوع cPanel را نمی‌گیرد.

> **وضعیت فعلی:** `BLOCKED — NOT RUN ON STAGING`. در این workspace به حساب cPanel، Addon Domain آزمایشی، دیتابیس MySQL هاست، logهای Passenger یا mailbox/شمارهٔ تست دسترسی نداریم. بنابراین هیچ مورد میزبانی‌شده‌ای پاس اعلام نمی‌شود و پروژه تا ثبت شواهد زیر «آمادهٔ دیپلوی Production» نیست. روش تنظیم env و backup در [راهنمای عملیات Production](production-operations.md) آمده است.

## ۱. اصول اجرا و ثبت شواهد

- staging باید hostname، TLS، Node/Python runtime، Passenger routing، MySQL و quotaهایی نزدیک به Production داشته باشد. تفاوت هرکدام را پیش از آزمون ثبت کنید.
- فقط دادهٔ ساختگیِ مشخص با پیشوند قابل‌شناسایی مانند `acceptance-<UTC timestamp>` و حساب‌های اختصاصی staging استفاده شود؛ هیچ حساب، شماره، mailbox یا دادهٔ شخصی Production برای تست به کار نرود.
- secrets در محیط امن همان App/حساب تنظیم شوند. در transcript، screenshot، ticket و لاگ گزارش، مقدار secret، cookie، password، query حاوی دادهٔ کاربر یا محتوای تماس ثبت نشود.
- برای هر آزمون: commit SHA، تاریخ/زمان و timezone، نام staging، اقدام، expected/actual status، لینک/نام artifact امن و نتیجهٔ `PASS / FAIL / BLOCKED` ثبت شود. `PASS` فقط با مشاهدهٔ رفتار واقعی و مدرک قابل بازبینی مجاز است.
- پس از هر شکست 5xx، timeout، migration، restore یا تغییر env، علت رفع و همان آزمون دوباره اجرا شود. از «در مرورگر باز شد» به‌تنهایی نتیجه‌گیری نکنید.

## ۲. گیت‌های اجرای نسخه

### A. هویت نسخه و محیط

1. SHA مستقرشده را با commit مورد بررسی PR تطبیق دهید؛ build artifact از همان SHA باشد.
2. از cPanel/provider نسخهٔ دقیق Python، Node، MySQL، Application URL/prefix، Document Root، HTTPS termination و proxy hop را ثبت کنید.
3. بررسی کنید `DJANGO_SETTINGS_MODULE=config.settings.production` فعال است و `DEBUG=False`؛ مقدار هیچ secret را چاپ نکنید.
4. در production/staging دادهٔ seed دمو را وارد نکنید. دستور `seed_demo_data` باید تحت `config.settings.production` اجرا نشود و `CommandError` بدهد؛ هر `seed_demo_data` پیشین در staging قابل‌پاک‌سازی باید قبل از انتقال به Production شناسایی و حذف/جایگزین شود.

### B. Migration، static و frontend build

با محیط Production-like و پیش از بازکردن ترافیک:

```bash
# در virtualenv مربوط به backend، با env Production همین staging و از ریشهٔ clone
cd ~/EmmettWebSite
bash scripts/deploy_backend.sh
cd backend
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate --check --noinput
```

`deploy_backend.sh` باید با exit code صفر تمام شود و خروجی migration، `collectstatic --noinput --clear`، `check --deploy` و Passenger restart بازبینی شود؛ `migrate --check` پس از اجرای script باید بگوید migration معوقی وجود ندارد. خطا یا warning حل‌نشده را pass فرض نکنید. اگر این script به env خصوصی CLI نیاز دارد، روش امن مورد تأیید provider را به‌کار ببرید؛ secret را به command line history ندهید.

سپس روی همان host Node، Environment Variables تأییدشده را بارگذاری و از ریشهٔ clone build واقعی را اجرا کنید:

```bash
cd ~/EmmettWebSite
bash scripts/deploy_frontend.sh --install-deps
```

پس از Restart، نسخهٔ جدید را با browser تازه و بدون cache باز کنید. خروجی build، exit code، Node version، restart و log startup را نگه دارید؛ فایل‌های `.next`/cache به‌جای خروجی build تفسیر نشوند.

### C. صفحه‌ها، زبان‌ها و ارتباط Next → Django

از مرورگر و `curl` مجاز روی دامنهٔ staging این موارد را بررسی کنید؛ hostname/prefix واقعی را از staging بگیرید، نه از مثال‌ها:

- `/` و `/en/`، مسیرهای سرویس/پروژه/بلاگ/آکادمی و یک صفحهٔ محتوایی جزئیات در هر زبان بارگذاری شوند؛ `lang`, `dir`, title و محتوای منتخب زبان درست باشند.
- مسیر ناموجود پاسخ 404 واقعی و صفحهٔ سفارشی نشان دهد؛ صفحهٔ خالی/دادهٔ seed ناخواسته یا 500 را pass نکنید.
- از مسیر عمومی Next، `GET /api/v1/health/` باید پاسخ موفق و `status: ok` با checkهای DB/cache سالم بدهد. اگر Python App مسیر mount جدا دارد، همان health را از مسیر مستقیم تاییدشده نیز بگیرید. هر دو host/route باید همان staging باشند.
- endpointهای موردنیاز API از طریق Next—حداقل health، فهرست و جزئیات CMS، search، endpointهای تماس و copy translations—با status/locale درست پاسخ دهند. log سرور باید نشان دهد درخواست‌ها به Python staging رسیده‌اند؛ موفقیت صفحه‌ای که از cache قدیمی آمده، به‌تنهایی اثبات ارتباط زنده نیست.
- مسیر Admin و redirect login باید prefix واقعی Python را حفظ کنند؛ static و media از مسیرهای مصوب قابل دسترسی باشند.

### D. Django Admin، انتشار و cache invalidation

با کاربر staff اختصاصی staging و بدون استفاده از ابرکاربر Production:

1. در hostname staging وارد Django Admin شوید، 2FA را طبق سیاست فعال کنید، یک logout واقعی انجام دهید و بعد از logout مطمئن شوید مسیر محافظت‌شده بدون نشست قابل مشاهده نیست.
2. یک رکورد قابل انتشار (برای نمونه BlogPost یا Service) با slug و عبارت یکتا بسازید. مقدار آزمایشی در هر دو زبان ثبت شود؛ هیچ متن واقعی مشتری وارد نشود.
3. رکورد را ابتدا `draft` ذخیره کنید. API عمومی و route متناظر Next نباید draft را در فهرست/جزئیات عمومی نشان دهند؛ مطابق قرارداد مدل، نبود رکورد عمومی باید 404/حالت empty باشد، نه fallback به رکورد ساختگی.
4. همان رکورد را منتشر/ذخیره کنید. پس از commit دیتابیس، با `FRONTEND_REVALIDATE_URL` و secret تنظیم‌شده باید event/response revalidation موفق باشد؛ درخواست بعدی Next باید marker جدید را از Django بخواند، نه پاسخ cache قبلی. این آزمون را در دو زبان اجرا کنید.
5. متن را دوباره ویرایش و سپس draft/archive یا حذف نرم کنید؛ cache باید متناسب invalidate شود و محتوای عمومی طبق قرارداد publishability تغییر کند. زمان ذخیره، log revalidation (بدون header/secret) و زمان مشاهدهٔ تغییر را ثبت کنید.
6. `site.copy` را برای هر دو locale در Admin باز کنید و یک کلید plain-text را تغییر دهید؛ درخواست `site-content/translations/?locale=...` و UI باید متن تغییر‌یافته را نشان دهد و tag همان locale invalidate شود. محتوای HTML/internal نباید از API عمومی بیرون بیاید.

اگر webhook غیرفعال است یا شکست می‌خورد، TTL fallback فقط recovery است؛ این مورد آزمون «on-demand cache invalidation» را پاس نمی‌کند. طبق قرارداد فعلی fallback cache محتوا/copy حداکثر ۶۰ ثانیه است؛ زمان واقعی را ثبت کنید و در صورت mismatch یا ماندگاری بیشتر، fail کنید.

### E. تماس، آپلود و اعلان‌ها

- با یک آدرس ایمیل/شمارهٔ staging مجاز و marker ساختگی، فرم تماس را از UI هر زبان ارسال کنید. پاسخ موفق را جدا از وجود Contact و Lead در Django Admin/DB ثبت کنید.
- فایل تصویری بی‌خطر و کوچک را از مسیر واقعی محصول بارگذاری کنید؛ status، ارتباط آن با رکورد، URL media، پاسخ content-type، cache و نمایش تصویر در Next بررسی شود. یک فایل بیش از سقف برنامه/provider و یک نوع/محتوای نامجاز باید رد شود. از اجرای فایل یا upload دادهٔ واقعی خودداری شود.
- تحویل ایمیل را مستقل بررسی کنید: SMTP backend واقعی، message ID/وضعیت provider و دریافت در inbox آزمایشی. `201` فرم یا DB record اثبات ارسال نیست.
- تحویل SMS را مستقل بررسی کنید: status/رسید provider و دریافت روی recipient آزمایشی مجاز. اگر API key یا مقصد تنظیم نیست یا Console backend است، نتیجه `DISABLED / NOT SENT` است، نه pass.
- هر خطای اعلان باید در log دیده شود بی‌آنکه پاسخ موفق ذخیرهٔ Contact/Lead را به 500 تبدیل کند. نام eventهای فعلی `contact_email_notification_failed` و `kavenegar_sms_failed` است؛ محتوای پیام/شماره/credential را در مدرک نیاورید.

### F. Draft، locale، empty/error و fallback

این رفتارها را روی staging بررسی و برای هرکدام response و UI را ثبت کنید:

- draft/archived، رکورد حذف نرم، slug ناموجود و فهرست خالی: فقط محتوای عمومی مجاز؛ 404/empty state طراحی‌شده، بدون دادهٔ نمونه.
- فارسی و انگلیسی: درخواست هر locale باید همان locale را به Django برساند و رکورد/ترجمهٔ همان زبان را نشان دهد؛ هر fallback زبان باید سیاست ثبت‌شده باشد.
- 4xx کنترل‌شده، پاسخ 5xx، upstream در دسترس‌نبودن و شکست/timeout: UI باید خطای کنترل‌شده نشان دهد، status درست داشته باشد و event امن در log ثبت شود. این حالات را فقط در staging و در بازهٔ کنترل‌شده آزمایش کنید؛ سرویس Production را عمداً قطع نکنید.
- متن‌های قابل‌ویرایش `frontend/messages/fa.json` و `en.json` را با command غیرمخرب در صورت نیاز به CMS منتقل کنید:
  ```bash
  python manage.py import_frontend_copy
  ```
  این command به‌صورت پیش‌فرض رکوردهای موجود را overwrite نمی‌کند. ابتدا روی staging اجرا، تعداد created/preserved را بررسی و keyهای نیازمند ویرایش تیم محتوا را در Admin تست کنید. در اجرای مجدد از `--overwrite` استفاده نکنید مگر مجوز صریح و backup داشته باشید.
- bundled messages در `request.ts` عمداً fallback حفظ‌شده برای زمان قطع API هستند؛ اکنون هر failure باید event `upstream_request_failed` را ثبت کند. این fallback برای copy عملیاتی تا وقتی API/CMS سالم و کلیدهای لازم در DB موجود نیستند، pass محسوب نمی‌شود. متن UI ساختاری (مثلاً labelهای navigation، validation و accessibility) می‌تواند در کد/ترجمه بماند؛ فهرست آن باید از متن‌های بازاریابی/محتوایی که تیم محتوا باید مستقل ویرایش کند جدا و مستند باشد.
- صفحهٔ Design System بخش نمونهٔ طراحی است، نه محتوای بازاریابی؛ در پذیرش Production مطمئن شوید از ناوبری/سایت‌مپ و مسیرهای ورودی بازاریابی افشا نشده یا آن را طبق تصمیم محصول noindex/محدود کرده‌اید.

### G. Log، timeout و observability

- خطاهای upstream از Next با event `upstream_request_failed` و متادیتای محدود (service، endpoint بدون query، status یا نوع خطا) ثبت می‌شوند؛ console/server handler، feed، CMS-copy، SEO و revalidation را در logهای Node بررسی کنید. متن exception، response body، query string، token و secret نباید در log باشند.
- statusهای 4xx مورد انتظار (مثل 404 محتوای ناموجود) را از 5xx و خطای شبکه جدا کنید؛ alert را روی رویدادهای تکراری/5xx و failureهای واقعی قرار دهید، نه هر 404 کاربر.
- logهای Django structured JSON، Node stdout/stderr و Passenger stderr را در cPanel واقعی پیدا کنید و دسترسی/retention آن‌ها را بررسی کنید. دو درخواست کنترل‌شده (یک پاسخ 4xx مورد انتظار و یک شکست upstream در staging) باید log درست تولید کنند.
- **گپ نیازمند تصمیم/تأیید:** fetch عمومی SSR Next → Django در کد فعلی timeout قابل‌تنظیم مشترک ندارد. آزمون باید latency/timeout واقعی Passenger/provider را بررسی کند؛ اگر سقف موردنیاز سرویس مشخص نیست، از provider/مالک سرویس آن را بگیرید و این گیت را `BLOCKED` بگذارید، نه اینکه عدد دلخواه تعیین کنید. webhook revalidation جداگانه timeout پیکربندی‌شده دارد.

### H. Backup و restore

1. با env staging، `python manage.py backup_db` اجرا کنید؛ خروجی DB، در صورت فعال‌بودن media خروجی media، manifest، SHA-256، زمان و فضای دیسک را ثبت کنید.
2. artifactها را با روش تأییدشده به مقصد offsite مستقل انتقال دهید، SHA-256 مقصد را با manifest تطبیق دهید و خروجی verify را ثبت کنید. فایل‌های local روی همان هاست offsite نیستند.
3. در DB و media root کاملاً جدا، restore از نسخهٔ انتقال‌یافته انجام دهید؛ script restore مخرب است و نباید target دیتابیس Production بگیرد. پس از بازیابی، رکورد marker، media نمونه، health و صفحهٔ staging را بررسی کنید.
4. نتیجه و مدت restore، نسخهٔ پشتیبان، تفاوت‌های محتوا و هر شکست را ثبت کنید. تنها موفقیت `backup_db` بدون restore واقعی، این گیت را پاس نمی‌کند.

## ۳. بررسی وضعیت دادهٔ Production و محتوای CMS

- `seed_demo_data` فقط برای dev/demo است و کد اجرای آن با `config.settings.production` را حتی با `--force` رد می‌کند؛ CI seed محلی خودش را دارد. این تست محافظتی به‌تنهایی ثابت نمی‌کند دادهٔ موجود روی Production ساختگی نیست.
- پیش از Go-Live، محتوا و حساب‌های موجود را با مالک محتوا بازبینی کنید. slug/نام‌های demo، ایمیل‌های `@emmett.dev`، پیام‌های نمونه و media placeholder نباید ناخواسته در محیط واقعی باشند.
- مدل‌های Services، Projects، Blog، Academy، Team، Testimonials، SEO/FAQ/Redirect و ترجمه‌های `site.copy` دادهٔ CMS دارند؛ ساختار route، layout، اجزای UI، پیام‌های اعتبارسنجی و منطق فنی طبیعی است در کد بماند.
- عبارت‌های عمومی/بازاریابی در `messages/*.json` ابتدا bundled هستند؛ برای ویرایش مستقل، import create-only را اجرا و تغییر CMS را در هر دو locale و پس از cache invalidation اثبات کنید. نمونه‌های آگاهانه مانند صفحهٔ Design System باید مستند و از محتوای بازاریابی Production تفکیک شوند.
- معیار «محتوای داینامیک» فقط وقتی pass است که تیم محتوا با دسترسی CMS بتواند متن/رکورد مورد توافق را بدون build/deploy کد ویرایش/منتشر کند و تغییر از frontend پس از invalidation دیده شود؛ ساختار و منطق همچنان در کد می‌مانند.

## ۴. ثبت نتیجهٔ Go/No-Go

برای هر ردیف یک شواهد مشخص (نام artifact یا لینک داخلیِ مجاز، بدون secret/PII) درج کنید. `BLOCKED` یا خالی بودن هر گیت الزامی به معنی **No-Go** برای اعلام Production-ready است.

| گیت | وضعیت | SHA/زمان/محیط | شاهد امن و توضیح شکست/اقدام |
|---|---|---|---|
| Runtime، env، TLS، proxy و مسیرهای واقعی cPanel | BLOCKED — staging در دسترس نیست | — | اجرای مالک هاست لازم است |
| Production frontend build و restart | BLOCKED — staging در دسترس نیست | — | CI build فقط smoke/quality مخزن است |
| `migrate` + `collectstatic` روی MySQL/Passenger شبیه Production | BLOCKED — staging در دسترس نیست | — | CI/SQLite جای staging را نمی‌گیرد |
| Home، localeها، صفحه‌های CMS و API مستقیم/proxy | BLOCKED — staging در دسترس نیست | — | Playwright CI با localhost/seed محلی معادل دامنهٔ واقعی نیست |
| Django Admin login/logout و 2FA | BLOCKED — staging در دسترس نیست | — | نیازمند حساب staging |
| CMS draft → publish → revalidation → مشاهدهٔ تغییر در UI | BLOCKED — staging در دسترس نیست | — | تست واحد cache جای چرخهٔ واقعی را نمی‌گیرد |
| Contact DB + upload/media + ایمیل/SMS مستقل | BLOCKED — staging در دسترس نیست | — | هیچ ارسال واقعی مجاز نشده است |
| زبان‌ها، empty/error/timeout و logهای cPanel | BLOCKED — staging در دسترس نیست | — | timeout عمومی SSR نیازمند تعیین سقف توسط provider/مالک است |
| دادهٔ Production بدون seed/fallback ناخواسته و محتوای CMS مستقل | BLOCKED — staging در دسترس نیست | — | DB واقعی و ویرایش تیم محتوا بررسی نشده‌اند |
| Backup خارج از هاست + checksum + restore جداگانه | BLOCKED — staging در دسترس نیست | — | مقصد offsite و account restore تأیید نشده‌اند |

### حکم پذیرش

**تا وقتی تمام گیت‌های staging بالا با شواهد قابل بازبینی `PASS` نشده‌اند، پروژه را آمادهٔ استقرار Production روی Addon Domain اعلام نکنید.** CI سبز، تست localhost یا مستندات آماده این شرط را جایگزین نمی‌کنند. در وضعیت ثبت‌شدهٔ این سند، حکم نهایی `NO-GO / WAITING FOR STAGING ACCESS AND OWNER EVIDENCE` است.
