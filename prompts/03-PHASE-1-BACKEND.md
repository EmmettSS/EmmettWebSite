# فاز ۱ — بک‌اند کامل Django + الگوهای cPanel
### API، admin به‌عنوان CMS، Static Bridge، کار پس‌زمینه با cron، تست‌ها

> **پرامپت خودکفا.** فرض: فاز ۰ تمام شده (monorepo، CI، ADR-001..008، `lib/jalali` و
> `lib/toman` تست‌شده). اول `prompts/00-MASTER.md` را بخوانید؛ اگر گیت‌های فاز ۰ سبز نیستند،
> **اول آن‌ها را درست کنید** — این‌ها پیش‌شرط‌اند.
>
> ⭐ **نکتهٔ مرکزی این فاز:** ما روی cPanel اشتراکی هستیم. §۵.۳ از MASTER هشت الگوی جایگزین
> اجباری تعریف کرده. این فاز آن الگوها را **یک‌بار برای همیشه** پیاده می‌کند تا فازهای بعد
> فقط استفاده کنند. **این فاز زیرساختی است؛ کیفیت آن تعیین می‌کند بقیهٔ برنامه ممکن است یا نه.**

---

## ۱. مأموریت

بک‌اند تولیدی کامل در `api/`: لیدها، محتوا، ابزارها، صف کار پس‌زمینه، Static Bridge،
ایمیل، admin به‌عنوان CMS واقعی، OpenAPI، و بستهٔ استقرار cPanel.
**بدون Docker، بدون Redis، بدون Celery، بدون WebSocket، بدون پروسهٔ بلندمدت.**

---

## ۲. پشته (قفل‌شده)

Python 3.12 · Django 5.2 LTS · DRF · drf-spectacular · whitenoise ·
MariaDB/MySQL (کد سازگار با Postgres قابل قبول) · `Asia/Tehran` · localeهای `fa` و `en`.

---

## ۳. ساختار

```
api/
├── manage.py
├── emmett/            # settings: base / dev / prod · urls · wsgi
├── apps/
│   ├── core/          # health, sitemaps, RSS, SiteConfig, render_public_html, Static Bridge
│   ├── jobs/          # ⭐ موتور کار پس‌زمینه (ADR: cron + DB queue)
│   ├── leads/         # ContactLead, NewsletterSubscriber, WaitlistSignup
│   ├── tools/         # آمار استفادهٔ ابزارها، نتایج اشتراکی
│   ├── scanner/       # ScanJob, ScanResult (فاز ۳ مصرف می‌کند)
│   ├── assistant/     # AssistantChunk, AssistantAnswer (فاز ۳ مصرف می‌کند)
│   └── content/       # Post, Category, CaseStudy, TeamMember, Testimonial, JobOpening
├── requirements/      # base.txt / dev.txt / prod.txt (pin شده)
└── tests/
```

**در این فاز، `scanner/` و `assistant/` فقط مدل‌ها و صف را می‌گیرند** — منطقشان در فاز ۳ است.
این کار عمداً انجام می‌شود تا **زیرساخت مشترک یک‌بار ساخته و تست شود.**

---

## ۴. موتور کار پس‌زمینه (⭐ مهم‌ترین بخش این فاز)

الگوی §۵.۳: **cron + صف در DB**. این زیرساخت، F-06 (اسکنر) و F-08 (embedding) را ممکن می‌کند.

### مدل
```python
class Job(models.Model):
    kind        = CharField(choices=..., db_index=True)   # "scan" | "embed" | "og_image" | "digest"
    payload     = JSONField()
    state       = CharField(choices=PENDING/RUNNING/DONE/FAILED, db_index=True)
    attempts    = PositiveSmallIntegerField(default=0)
    max_attempts= PositiveSmallIntegerField(default=3)
    locked_by   = CharField(null=True)                    # شناسهٔ worker
    locked_at   = DateTimeField(null=True)                # برای آزادسازی قفل مرده
    result      = JSONField(null=True)
    error       = TextField(null=True)
    progress    = JSONField(default=list)                 # ⭐ گام‌ها برای chunked polling
    created_at  / started_at / finished_at
```

### management command
```
python manage.py process_jobs --kind=scan --limit=5 --timeout=90
```
- claim اتمیک با `select_for_update()` روی ردیف‌های `PENDING` (MariaDB `FOR UPDATE SKIP LOCKED`).
- آزادسازی قفل‌های مرده: `RUNNING` با `locked_at` قدیمی‌تر از timeout → برگشت به `PENDING`.
- ثبت `progress` در هر گام (برای polling کلاینت).
- اجرای handler ثبت‌شده در یک registry: `JOBS = {"scan": run_scan, "embed": run_embed, ...}`.

### cron (در `deploy/crontab.txt`)
```
*/1 * * * *  python manage.py process_jobs --kind=scan  --limit=5  --timeout=90
*/5 * * * *  python manage.py process_jobs --kind=embed --limit=20 --timeout=120
*/10 * * * * python manage.py process_jobs --kind=og    --limit=10 --timeout=60
0 3 * * *    python manage.py render_public_html --incremental
30 3 * * *   python manage.py db_backup
```

### Chunked Polling (ADR-008) — الگوی اجباری
```
POST /api/v1/<x>/jobs/            → 202 { job_id }
GET  /api/v1/<x>/jobs/<id>/poll/?offset=n
                                  → 200 { state, progress: [...], result?, offset_next }
```
- هر پاسخ **< ۲ ثانیه**. هیچ `Transfer-Encoding: chunked` طولانی.
- `offset` = تعداد گام‌هایی که کلاینت قبلاً دیده → **بدون گام تکراری**.
- یک mixin قابل استفاده مجدد: `class PollableJobView` — تا فازهای بعد copy-paste نکنند.

### تست (اجباری)
- دو worker همزمان روی یک صف → **هیچ job دوبار اجرا نمی‌شود** (تست race condition با thread).
- قفل مرده آزاد می‌شود.
- polling با offset → گام تکراری ندارد.
- job ناموفق → retry تا `max_attempts` سپس `FAILED` با `error`.
- **هیچ job بیش از timeout اجرا نمی‌شود.**

---

## ۵. مدل محتوا و i18n (ADR-002)

- همهٔ مدل‌های محتوایی: `*_fa` و `*_en` + `slug` (ASCII، یکتا) + `slug_fa` (فارسی، اختیاری).
- **انتشار نیازمند کامل بودن `fa`** است. نقص `en` → هشدار در admin، نه 500.
- تعیین زبان: locale مسیر برنده است؛ `?lang=` فقط fallback برای API.
- تاریخ: ذخیره ISO-8601 UTC، **نمایش شمسی** (تبدیل در لبه، با `lib/jalali` مشترک).
- پول: **integer تومان**، هرگز float.

---

## ۶. Endpointها

```
# عمومی (خواندنی، بدون احراز هویت، با throttle)
GET  /api/v1/health/                       → { status, version, uptime, db }
GET  /api/v1/public/tools/                 → فهرست ابزارها (برای ترمینال F-07)
GET  /api/v1/public/team/
GET  /api/v1/public/case-studies/
GET  /api/v1/public/posts/?category=&lang=
GET  /api/v1/public/bio/analyze/           → فاز ۴
GET  /api/v1/site-config/                  → برند، تلگرام، وضعیت «الان چه می‌سازیم»

# ابزارها (فاز ۲ منطقشان را می‌آورد؛ اینجا فقط contract)
GET  /api/v1/tools/jalali/{convert,diff,workdays,holidays}/
POST /api/v1/tools/kod-meli/validate/
GET  /api/v1/tools/toman/format/
POST /api/v1/tools/persian-text/normalize/
GET  /api/v1/tools/jwt/analyze/

# لیدها
POST /api/v1/leads/contact/
POST /api/v1/leads/newsletter/             + POST /newsletter/unsubscribe/
POST /api/v1/leads/waitlist/               { product, email, use_case }
POST /api/v1/leads/job-application/

# صف‌محور (فاز ۳ و ۴)
POST /api/v1/scanner/jobs/                 + GET .../poll/
POST /api/v1/assistant/ask/                + GET .../poll/

# محتوا
GET  /api/v1/content/{posts,case-studies,jobs}/ + جزئیات با slug
```

- همه زیر `/api/v1/`، نسخه‌دار.
- **OpenAPI با drf-spectacular** در `/api/schema/` و UI در `/api/docs/`.
- **تایپ‌های TS از OpenAPI تولید می‌شوند** (حفظ از v1) — `pnpm api:types` در `web/`.
- throttle پیش‌فرض: ۶۰/ساعت بر IP؛ endpointهای نوشتنی: ۵/ساعت + هانی‌پات.

---

## ۷. Admin به‌عنوان CMS واقعی

- همهٔ مدل‌های محتوایی با فیلدهای fa/en کنار هم (fieldsets دوزبانه).
- **پیش‌نمایش** قبل از انتشار.
- `SiteConfig` singleton: برند، handle تلگرام، خط «الان چه می‌سازیم»، اعداد throughput آزمایشگاه (F-09).
- **خروجی گرفتن لیدها** به CSV.
- هشدار در admin وقتی `en` ناقص است.
- **دسترسی‌ها:** نقش editor و admin. هیچ‌کس خارج از تیم.

---

## ۸. Static Bridge (ADR-003)

`python manage.py render_public_html [--incremental] [--force]`

- HTML قابل crawl برای **هر** روت محتوایی می‌سازد: meta کامل + hreflang + JSON-LD + **متن کامل مقاله**.
- بدون JS کار می‌کند. SPA روی همین سند hydrate می‌شود.
- روت‌های بازاریابی در **CI** با puppeteer prerender می‌شوند (نه روی سرور).
- جزئیات محتوا (پست، کیس‌استادی) **روی سرور** با template Django رندر می‌شوند —
  چون سرور Django دارد، این ساده‌تر و قابل‌اتکاتر از prerender است.
- ⚠️ **هیچ headless browser روی cPanel اجرا نمی‌شود.** این یک قید سخت است.

---

## ۹. ایمیل

- الگوی **transactional outbox**: ایمیل در جدول `EmailOutbox` در همان تراکنش ذخیره می‌شود،
  cron ارسال می‌کند. این یعنی ایمیل هرگز با خطای SMTP گم نمی‌شود.
- backend قابل تعویض: dev = console، prod = SMTP از env.
- قالب‌های دوزبانه (fa پیش‌فرض).
- تأیید ایمیل برای newsletter و waitlist (تک‌کلیکی، توکن زمان‌دار).

---

## ۱۰. امنیت (بررسی برای هر endpoint)

اعتبارسنجی ورودی با serializer · CSRF برای نشست‌ها · throttling ·
**هانی‌پات روی همهٔ فرم‌ها** · هدرهای امنیتی (CSP، X-Frame-Options، X-Content-Type-Options،
Referrer-Policy، HSTS) · اعتبارسنجی آپلود (نوع + اندازه + **هرگز** مسیر کاربر مستقیم به `open()`) ·
`pip-audit` بدون high/critical · **هیچ secret در ریپو** · `.env.example` کامیت‌شده.

⚠️ **هیچ endpointی کد کاربر را سمت سرور اجرا نمی‌کند.** این یک خط قرمز است (G5 و §۵.۳).

---

## ۱۱. بستهٔ استقرار cPanel

```
deploy/
├── crontab.txt              # خطوط cron آمادهٔ کپی
├── wsgi.py                  # برای cPanel Python App
├── passenger_wsgi.py        # در صورت نیاز
├── requirements-prod.txt    # pin کامل
├── DEPLOY-CPANEL.fa.md      # ⭐ راهنمای قدم‌به‌قدم فارسی با اسکرین‌شات/مسیر دقیق
├── DEPLOY-CPANEL.en.md
└── scripts/                 # migrate, collectstatic, seed, backup, restore
```

راهنما باید این‌ها را بپوشاند: ساخت Python App · venv · env vars ·
`migrate` · `collectstatic` · cron · AutoSSL · DNS · **بازیابی از بکاپ**.

---

## ۱۲. دادهٔ اولیه

`python manage.py seed_demo` — دادهٔ نمونهٔ دوزبانه برای dev:
۴ پست، ۲ کیس‌استادی، ۴ عضو تیم، ۲ موقعیت شغلی، SiteConfig پر شده.
⚠️ **هرگز نام مشتری یا متریک ساختگی به‌عنوان دادهٔ واقعی** (قاعدهٔ ۴ از §۱۲ MASTER).
دادهٔ نمونه با مارکر `[SAMPLE]` مشخص می‌شود.

---

## ۱۳. تست‌ها

- pytest + pytest-django، پوشش **≥ ۸۰٪ روی منطق کسب‌وکار**.
- تست اجباری برای: موتور job (race condition، قفل مرده، retry) · polling offset ·
  i18n resolution · outbox ایمیل · throttle و هانی‌پات · Static Bridge خروجی معتبر ·
  هر endpoint عمومی (contract test).
- **contract test:** OpenAPI تولیدشده با تایپ‌های TS در `web/` سازگار باشد (CI).

---

## ۱۴. ورودی‌های لازم

- **`B2` (دسترسی cPanel: نسخهٔ Python و MySQL) — این ورودی می‌تواند فاز را متوقف کند.**
  در غیابش: dev روی SQLite/MySQL محلی ادامه می‌یابد و `B2` در OPEN-ITEMS ثبت می‌شود.
- `B3` (SMTP) — dev از console backend استفاده می‌کند، پس مسدودکننده نیست.

---

## ۱۵. گیت‌های خروج

- [ ] همهٔ تست‌ها سبز، پوشش ≥ ۸۰٪ روی منطق کسب‌وکار (عدد واقعی در گزارش).
- [ ] **موتور job: تست race condition دو worker همزمان پاس شده** (این حیاتی است).
- [ ] **Chunked polling: بدون گام تکراری، هر پاسخ < ۲ ثانیه** (اندازه‌گیری‌شده).
- [ ] OpenAPI در `/api/docs/` زنده و تایپ‌های TS از آن تولید می‌شود.
- [ ] **هیچ endpoint بیش از ۲۵ ثانیه طول نمی‌کشد** (تست زمان‌سنجی).
- [ ] Admin: ساخت یک پست دوزبانه → دیده‌شدن در سایت + sitemap + RSS.
- [ ] Outbox ایمیل: خطای SMTP → ایمیل گم نمی‌شود و بعداً ارسال می‌شود (تست).
- [ ] Static Bridge: هر روت محتوایی HTML کامل بدون JS دارد.
- [ ] `deploy/DEPLOY-CPANEL.fa.md` نوشته شده (راستی‌آزمایی واقعی در فاز ۵).
- [ ] `pip-audit` بدون high/critical · secrets scan تمیز.
- [ ] `docs/API.md` و `docs/CPANEL-PATTERNS.md` (با کد نمونهٔ واقعی) نوشته شده‌اند.

---

## ۱۶. آنچه فازهای بعد می‌توانند به آن تکیه کنند

**یک موتور کار پس‌زمینهٔ تست‌شده** (مهم‌ترین دارایی) · `PollableJobView` قابل استفاده مجدد ·
API عمومی برای ترمینال F-07 · contract ابزارها · OpenAPI + تایپ‌های TS ·
Static Bridge · outbox ایمیل · seed data · admin CMS.

---

*فاز ۱ از بستهٔ v2 · ۲۰۲۶-۰۹-۲۳*
