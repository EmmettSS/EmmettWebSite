# فاز ۰ — نقشهٔ معماری

## ۱. شکل کلی

سیستم یک modular monolith جنگو به‌همراه یک فرانت‌اند Next.js است:

```text
Browser
  → Next.js App Router (fa/en, SSR/ISR, same-origin /api/* and /media/*)
  → Django/DRF /api/v1/*
  → MySQL 8 (production) / SQLite (local/CI)
```

مسیرهای مرورگر هرگز مستقیم به localhost backend نمی‌روند. `frontend/src/app/api/[...path]/route.ts` و `frontend/src/app/media/[...path]/route.ts` پراکسی هم‌مبدأ هستند. فراخوانی‌های سروری SSR/ISR از `INTERNAL_API_URL` و هدر `X-Internal-Token` استفاده می‌کنند.

## ۲. اپ‌های بک‌اند

| اپ | مسئولیت | مدل‌های اصلی |
|---|---|---|
| `accounts` | کاربر، پروفایل، علاقه‌مندی، auth API | `User`, `Profile`, `Favorite` |
| `academy` | مدرس، دوره، درس، ثبت‌نام | `Instructor`, `Course`, `Lesson`, `Enrollment` |
| `ai_engine` | کاتالوگ، prompt، guardrail، تخمین، درخواست/پیشنهاد/مفهوم، artefact | `Catalog`, `CatalogOption`, `PromptTemplate`, `GuardrailRule`, `EstimationRule`, `AIRequest`, `AISuggestion`, `AIConcept`, `AIContentArtifact` |
| `api` | فقط ترکیب URL نسخه‌دار `/api/v1/` | بدون مدل |
| `blog` | مقاله، نظر، RSS، خلاصهٔ هوشمند | `BlogPost`, `Comment` |
| `company` | تیم و توصیه‌نامه | `TeamMember`, `Testimonial` |
| `core` | پایه، audit، media، translation، SEO، search، redirect، FAQ، settings | `BaseModel`, `AuditLog`, `Media`, `Translation`, `SiteSettings`, `SearchIndexEntry`, `Redirect`, `FAQItem` |
| `leads` | تماس، سرنخ، خبرنامه | `Contact`, `Lead`, `Newsletter` |
| `portfolio` | پروژه/محصول و case study | `Project`, `CaseStudy` |
| `services` | خدمات | `Service` |
| `taxonomy` | دسته‌بندی و برچسب | `Category`, `Tag` |

تعداد فایل‌های migration اپ‌ها: academy 2، accounts 2، ai_engine 2، blog 1، company 1، core 5، leads 2، portfolio 1، services 1، taxonomy 1.

## ۳. لایه‌های مشترک بک‌اند

- `BaseModel`: soft-delete، `public_id` در مدل‌های دامنه‌ای، managerهای `objects`/`all_objects`.
- `PublishableModel` و `SEOMetaModel`: گردش انتشار و متادیتای محتوایی.
- `PublicReadOnlyViewSet`: خواندن عمومی منتشرشده‌ها با lookupSlug؛ پیش‌فرض سراسری API، Session + `IsAuthenticated` است و endpointهای عمومی صریحاً `AllowAny` می‌شوند.
- `core/security.py`: قفل ورود، ip/get_client_ip و محافظت brute-force.
- `core/throttling.py`: نرخ‌های anon/user/contact/ai/auth/newsletter و bypass داخلی فقط برای throttle پیش‌فرض.
- `core/middleware.py`: security headers، audit/request context، اجبار 2FA ادمین و redirect fallback.
- `core/search.py`: MySQL FULLTEXT در production و SQLite FTS5 در dev/test.
- `core/frontend_translations.py` و `core/frontend_cache.py`: خروجی `site.copy` و webhook امن revalidate.
- `core/resources.py`: import/export با schema_version، فرمت‌های CSV/TSV/JSON و formula-escape.
- `core/management/commands/backup_db.py`: mysqldump/gzip یا fallback dumpdata؛ SQLite VACUUM INTO؛ manifest SHA-256 و retention تعدادی.

## ۴. فرانت‌اند

App Router زیر `frontend/src/app/[locale]/(ui)/(pages)` شامل صفحه‌های اصلی، خدمات، پروژه‌ها، محصولات، آکادمی، بلاگ/کتابخانه، درباره، تماس، جست‌وجو، پروفایل، advisor، estimate و design-system است. مسیرهای محصول `products/crm` و `products/pentestor` پوستهٔ اختصاصی دارند؛ Pentestor به صفحهٔ واقعی پروژه واگذار می‌شود و CRM در خط مبنا ComingSoon است.

لایه‌های کلیدی:

- `src/lib/api/server.ts`: خواندن سروری محتوا با revalidate و هدر داخلی.
- `src/lib/api/client.ts`: عملیات مرورگر با CSRF cookie و same-origin proxy.
- `src/lib/api/seo.ts` و `redirect-cache.ts`: SEO/redirect با کش و fallback.
- `src/i18n/*` و `messages/{fa,en}.json`: next-intl، جهت و پیام‌های UI.
- `src/proxy.ts`: اعمال redirectهای مدیریت‌شده در لبهٔ Next.
- `src/app/api/revalidate/route.ts`: webhook bearer با سقف payload/tag و fail-closed.
- `scripts/verify-rendering.mjs`: گیت prerender و h1 قابل مشاهده.
- `scripts/measure-perf.mjs`: اندازه‌گیری TTFB/HTML/JS.

## ۵. کش و انتشار محتوا

| داده | TTL/روش |
|---|---|
| محتوای عمومی | ISR 60 ثانیه |
| SEO settings | 900 ثانیه |
| Redirectها | 300 ثانیه |
| ترجمه‌های `site.copy` | revalidate 60 + tag `site-copy:{fa,en}` |
| داشبورد ادمین | cache 120 ثانیه |
| Advisor | cache کلید `ai:advisor:{request_hash}` |

signalهای `FAQItem`، `Media`، `Redirect` و `SiteSettings` کش مربوط را invalidate می‌کنند. webhook revalidate فقط با bearer secret، payload حداکثر 4KiB و حداکثر ۲۰ tag پذیرفته می‌شود.

## ۶. امنیت و استقرار

- production: WhiteNoise، manifest static، CSP/security headers، CSRF trusted origins از `PUBLIC_SITE_URL`، اجبار 2FA ادمین به‌صورت پیش‌فرض.
- cPanel: Passenger Python برای Django و Passenger Node برای Next؛ اسکریپت‌های `deploy_backend.sh` و `deploy_frontend.sh` ورودی‌های امنیتی و health را اجبار می‌کنند.
- `deploy_frontend.sh` پیش از build منتظر health بک‌اند می‌ماند؛ build بدون backend/token می‌تواند 404ها را در prerender تثبیت کند.
- backup/restore و preflight جداگانه وجود دارد؛ restore فقط با برنامهٔ بازیابی و تأیید عملیاتی مجاز است.

## ۷. ریسک‌های معماری مشاهده‌شده

1. وابستگی build فرانت‌اند به backend زنده؛ خطای upstream باید در CI/deploy دیده شود، نه اینکه صفحهٔ خالی پخته شود.
2. throttle پیش‌فرض anon روی loopback می‌تواند SSR/پراکسی را در یک سطل مشترک قرار دهد؛ توکن داخلی این را حل می‌کند ولی پیکربندی هاست باید درست باشد.
3. Admin فعلی روی Jazzmin/AdminLTE/Bootstrap سوار است؛ حذف آن نیازمند جایگزینی قالب‌ها، staticها، 2FA templates و تست‌های وابسته است.
4. MySQL در محیط محلی آزمایش نشده؛ هر تغییر query/index باید روی MySQL 8 نیز تأیید شود.
