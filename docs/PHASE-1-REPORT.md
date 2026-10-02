# گزارش اجرای فاز ۱ — Django backend + cPanel patterns

**وضعیت:** هستهٔ backend پیاده‌سازی و در SQLite محلی آزموده شد؛ استقرار و race validation روی MariaDB/cPanel **در انتظار B2 و CI خارجی** است.

## خروجی‌های ساخته‌شده
- Django 5.2.17 + DRF 3.17.2، تنظیمات base/dev/prod، WSGI/Passenger، WhiteNoise، timezone `Asia/Tehran`، SQLite برای توسعه و MariaDB/MySQL از env.
- مدل و migration برای queue `Job`, `ScanJob`, `ScanResult`, `AssistantChunk`, `AssistantAnswer`, آمار ابزار/نتیجه، leadها، outbox، محتوای دوزبانه (Post/Category/CaseStudy/TeamMember/Testimonial/JobOpening/SiteConfig) و JobApplication.
- claim صف در transaction با `select_for_update(skip_locked=True)`، recover قفل stale، handler registry، progress append و retry/backoff، bounded worker که روی main-thread Unix با `SIGALRM` timeout اعمال می‌کند، management command `process_jobs` و `PollableJobView` با offset بدون تکرار.
- API health (DB/version/uptime)، catalog فعلاً خالی به‌صورت صادقانه تا ابزارهای فاز ۲ ساخته شوند، public team/posts/case studies/site config، content lists، contact/newsletter/waitlist/job application؛ validation، honeypot، throttle نوشتنی ۵ در ساعت/IP و CSRF session admin.
- newsletter token امضاشده با انقضای ۴۸ ساعته، confirmation و unsubscribe؛ transactional outbox و `send_outbox` با retry/backoff و بازیابی قفل `sending` stale.
- RSS و XML sitemap پویای محتوای منتشرشده زیر `/api/v1/`؛ HTTPS `PUBLIC_SITE_URL` در production اجباری است.
- Django admin/CMS برای محتوا و leads، editor group با permissionهای محتوا، CSV export با خنثی‌سازی formula injection، محتوای seed با `[SAMPLE]` در draft.
- OpenAPI در `/api/schema/` و Swagger در `/api/docs/`، schema در `api/schema.yml` و TS typegen.
- Django template Static Bridge برای detailهای منتشرشدهٔ fa/en؛ headers امنیتی شامل CSP و Referrer/Permissions policy؛ runbookهای deploy و cron، backup/restore command و wrapper محدود به allowlist.

## شواهد محلی
- Django system check: پاس.
- migration drift check: `No changes detected`.
- schema generation/validation با `--fail-on-warn`: پاس.
- pytest: **۲۱ پاس، ۱ skip**. skip، تست race دو worker روی SQLite است (SQLite قابلیت `SKIP LOCKED` ندارد).
- پوشش `apps.jobs`, `apps.leads`, `apps.content`: **۸۷٫۱۴٪**؛ از آستانهٔ ۸۰٪ بیشتر. `apps.core` در این عدد coverage وارد نشده است.
- ruff check/format: پاس.
- pip-audit: **صفر آسیب‌پذیری شناخته‌شده** در requirements پایه.
- SQLite backup و restore با schema نهایی از طریق management commandهای واقعی اجرا شد؛ restore و `manage.py check` پس از آن موفق بود. این، جای آزمون MySQL یا staging نیست.
- تنظیمات تولید fail-closed: نبود secret در `DEBUG=false` رد شد و مجموعهٔ آزمایشی host/HTTPS/SMTP از `manage.py check` عبور کرد. این فقط validation تنظیمات است، نه اتصال/تحویل ایمیل واقعی.

## موارد باز / عدم ادعای تکمیل
- تست race اتمیک در workflow MariaDB 10.11 تعریف شده اما در این sandbox اجرا نشده؛ بنابراین تضمین رقابت روی engine هدف هنوز شاهد محلی ندارد.
- Python محیط sandbox نسخهٔ 3.11 بود؛ production prompt Python 3.12 می‌خواهد. نسخهٔ واقعی cPanel و MariaDB در B2 نامعلوم است.
- Deploy/rollback روی staging، SMTP واقعی، cron cPanel، MySQL backup/restore و health روی دامنهٔ واقعی اجرا نشده‌اند؛ `DEPLOY-CPANEL.*` قالب اجرایی است، نه راستی‌آزمایی میزبانی.
- تست SMTP با backend mock/console است، نه ارسال واقعی؛ deliverability، DNS و تأیید ایمیل production هنوز B3 می‌خواهد.
- پایان دادن به handler در deadline با signal برای process اصلی cron enforce می‌شود؛ handlerهایی که در thread یا extension مسدودکننده اجرا شوند موظف‌اند timeout داخلی شبکه داشته باشند.
- محتوا و preview workflow در admin، audit matrix کامل و همهٔ endpointهای future tool/scanner/assistant هنوز کار فازهای بعد هستند؛ endpoint fake برای قابلیت نساختیم.
- `public/tools/` عمداً `items: []` برمی‌گرداند تا ابزارهای Phase 2 واقعاً ship شوند؛ هیچ ابزار آینده به‌عنوان live معرفی نشده.

## آنچه فاز ۲ می‌تواند استفاده کند
Django + migrations، queue/polling قابل توسعه، outbox، API/schema/typegen، CMS، public content و Static Bridge الگوی detail. قبل از تولید باید B2/B3 تکمیل، MariaDB race CI سبز و استقرار staging واقعی انجام شود.
