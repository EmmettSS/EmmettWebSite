# Emmett — Backend

پروژهٔ Django 5.2 + DRF که API نسخه‌دار (`/api/v1/`) سایت امیت را سرو
می‌کند. معماری کلان (Modular Monolith، مرزبندی اپ‌ها، i18n، احراز هویت و...)
در `../ARCHITECTURE.md` و ADRهای ریپو (تا `ADR-0026`) مستند شده؛ این فایل
راهنمای عملی توسعه و عملیات محلی است.

## راه‌اندازی محلی

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # شامل requirements.txt + ابزار تست/lint

cp .env.example .env   # و مقادیر را در صورت نیاز ویرایش کنید؛ پیش‌فرض‌ها برای dev کافی‌اند

export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py seed_demo_data      # دادهٔ نمایشی دوزبانهٔ ایدمپوتنت (پایین را ببینید)
python manage.py createsuperuser     # اختیاری؛ seed_demo_data از قبل admin@emmett.dev می‌سازد
python manage.py runserver 0.0.0.0:8000
```

API روی <http://localhost:8000/api/v1/> بالا می‌آید؛ پنل ادمین روی
`/admin/`. فرانت‌اند (`../frontend/`) باید جداگانه اجرا شود — ر.ک.
`../frontend/README.md`.

### دادهٔ نمایشی (`seed_demo_data`)

ایدمپوتنت است (اجرای دوباره خطا نمی‌دهد و رکورد تکراری نمی‌سازد؛ از
`get_or_create`/`update_or_create` استفاده می‌کند) و می‌سازد:

- کاربران: `admin@emmett.dev` (ادمین)، `author@emmett.dev` (ویرایشگر/نویسندهٔ
  بلاگ)، `client@emmett.dev` (مشتری نمونه با یک Enrollment).
- تیم و نظرات مشتریان، ۴ خدمت، ۳ پروژه (یکی `is_product=True` + یک
  CaseStudy)، ۳ دوره با درس و یک ثبت‌نام نمونه، ۳ پست بلاگ با یک کامنت
  نمونه، یک مشترک خبرنامه.

رمز عبور پیش‌فرض کاربران dev با متغیر محیطی `DEMO_ADMIN_PASSWORD` (و
مشابه) قابل override است — **هرگز از این دستور روی دیتابیس production
استفاده نشود.**

## تنظیمات (`config/settings/`)

سه‌لایه: `base.py` (مشترک) ← `dev.py` (`DEBUG=True`, SQLite، `LocMemCache`)
یا `production.py` (`DEBUG=False`, MySQL از طریق PyMySQL، `FileBasedCache`،
هدرهای امنیتی سخت‌گیرانه). تمام مقادیر حساس/محیطی از `.env` خوانده می‌شوند
(`django-environ`) — هرگز hard-code نشوند. `DJANGO_SETTINGS_MODULE` را قبل
از هر دستور `manage.py` export کنید (یا در `.env` تنظیم کنید).

## ساختار اپ‌ها

هر اپ دامنه‌ای مستقل است (Modular Monolith، `ADR-0002`) و معمولاً شامل
`models.py`, `admin.py`, `serializers.py`, `views.py`, `urls.py`,
`translation.py` (ثبت فیلدهای `django-modeltranslation`) و `tests/` خودش:

| اپ | مسئولیت | مسیر API |
| --- | --- | --- |
| `core` | `BaseModel`/soft-delete، `Media`، `Translation`، `AuditLog`، جست‌وجوی تمام‌متن، throttle/pagination/exception مشترک | `/health/`, `/search/`, `/schema/` |
| `accounts` | `User` سفارشی (ایمیل+رمز)، `Profile`، `Favorite`، ثبت‌نام/ورود/خروج | `/auth/` |
| `taxonomy` | `Category`/`Tag` مشترک بین اپ‌های محتوایی | `/taxonomy/` |
| `company` | `TeamMember`, `Testimonial` (صفحهٔ About) | `/company/` |
| `services` | `Service` | `/services/` |
| `portfolio` | `Project`, `CaseStudy` (شامل محصولات `is_product=True`) | `/projects/` |
| `academy` | `Instructor`, `Course`, `Lesson`, `Enrollment` | `/academy/` |
| `blog` | `BlogPost`, `Comment`, فید RSS | `/blog/` |
| `leads` | `Contact`, `Lead` (پایپ‌لاین فروش)، `Newsletter` | `/leads/` |
| `ai_engine` | Gateway مرکزی provider، Catalog/Prompt/Guardrail، advisor، estimator، audit و خلاصهٔ بلاگ | `/ai/` |
| `api` | بدون مدل؛ فقط ترکیب URLهای بالا زیر `/api/v1/` + OpenAPI | — |

## موتور AI (فاز ۵ — `ADR-0026`)

تمام فراخوانی‌های مدل فقط از `apps.ai_engine` عبور می‌کنند. provider عمومی
OpenAI-compatible بر پایهٔ `requests` است؛ SDK/dependency تازه‌ای اضافه نشده.
AI به‌صورت پیش‌فرض خاموش است. برای فعال‌سازی در محیط مقصد، مقادیر واقعی را
فقط در `.env` همان محیط تنظیم کنید: `AI_ENABLED`, `AI_API_BASE_URL`,
`AI_API_KEY`, `AI_MODEL`; timeout پیش‌فرض ۱۵ ثانیه، TTL کش ۲۴ ساعت و
retention audit پیش‌فرض ۳۶۵ روز است. `.env.example` فقط نام متغیرها و مقدارهای
خالی دارد؛ secret هرگز در Git یا گفتگو قرار نگیرد.

Endpointهای versioned و مستندشده در OpenAPI:

- `/api/v1/ai/catalogs/` — فقط Catalogها و گزینه‌های عمومی/فعال، با label محلی‌شده.
- `/api/v1/ai/advisor/` — حداکثر سه ایدهٔ اولیهٔ ساختاریافته؛ ورودی فقط کلیدهای Catalog.
- `/api/v1/ai/results/{token}/` — نتیجهٔ share عمومی، noindex و فاقد ورودی/اطلاعات تماس.
- `/api/v1/ai/leads/` — ساخت Contact با رضایت و Lead متصل به پیشنهاد/ایده؛ اطلاعات تماس به provider نمی‌رود.
- `/api/v1/ai/estimates/` — تخمین deterministic حداقل روز کاری؛ بدون مبلغ و بدون provider.
- خلاصهٔ تأییدشدهٔ مقاله به‌صورت `ai_summary` در جزئیات `/api/v1/blog/{slug}/` برمی‌گردد.

کاتالوگ‌های bootstrap و قواعد اولیه با migration وارد می‌شوند؛ در Admin قابل
ویرایش‌اند. خلاصهٔ بلاگ را ادمین/cron با `python manage.py generate_blog_summaries`
می‌سازد؛ نتیجه تا تأیید ادمین Draft می‌ماند. برای نگه‌داشت audit یک‌ساله،
`python manage.py purge_ai_audit --dry-run` را بررسی و سپس دستور
`python manage.py purge_ai_audit` را در cron روزانه/هفتگی مقصد زمان‌بندی کنید.
دادهٔ خلاصهٔ تأییدشده و ارتباط Lead هنگام purge audit حفظ می‌شوند.

## مستندات API

- Swagger UI: `/api/v1/schema/swagger-ui/`
- ReDoc: `/api/v1/schema/redoc/`
- اسکیمای خام OpenAPI: `/api/v1/schema/`

برای اعتبارسنجی کامل اسکیما (بدون warning/error):

```bash
python manage.py spectacular --file /tmp/schema.yaml --fail-on-warn
```

## تست و کیفیت کد

```bash
pytest                                  # کل تست‌ها (pytest-django + factory-boy)
pytest --cov=apps --cov-report=term     # نیاز به نصب جداگانهٔ pytest-cov
ruff check apps config                  # لینت
mypy apps config                        # type-check سخت‌گیرانه (strict)
```

همهٔ این دستورها باید روی کد فعلی تمیز اجرا شوند (Quality Gate این ریپو).

## امنیت و حسابرسی

- احراز هویت: Session + CSRF استاندارد Django (نه JWT) — `ADR-0007`/`ADR-0011`.
  فرانت‌اند باید اول `GET /api/v1/auth/csrf/` را صدا بزند تا کوکی
  `csrftoken` ست شود.
- Rate limiting: `rest_framework.throttling.ScopedRateThrottle` سفارشی
  (`apps/core/throttling.py`) روی فرم تماس، auth، عضویت خبرنامه و همهٔ
  endpointهای پرهزینهٔ AI (`ADR-0006`, `ADR-0026`).
- AI audit: `AIRequest` operational لاگ بدون IP، user-agent و اطلاعات تماس؛
  requester فقط HMAC pseudonym است و retention پیش‌فرض ۳۶۵ روز دارد.
  `AIContentArtifact` و نتیجهٔ share محتوای ماندگار جدا از audit هستند.
- حسابرسی: مدل `core.AuditLog` + تابع کمکی `log_action` رویدادهای حساس
  (ورود ناموفق/موفق، خروج، ثبت‌نام، تغییر نقش کاربر، حذف/بازیابی هر رکورد،
  تعدیل کامنت) را ثبت می‌کنند — `ADR-0013`. از پنل ادمین به‌صورت read-only
  در دسترس است.
- آپلود فایل: فقط از طریق Django Admin (بدون endpoint عمومی)؛ whitelist
  پسوند + بررسی سرنام (magic bytes) + سقف حجم روی `core.Media` — `ADR-0005`.
  هنگام دیپلوی production، `backend/deploy/media.htaccess.example` باید در
  `backend/media/.htaccess` کپی شود.

## محدودیت‌های شناخته‌شده (صریحاً مستند، نه فراموش‌شده)

- اسکن ویروس آپلودها با `clamd` پیاده‌سازی نشده (به فاز Deployment/Infra موکول شده).
- حذف/آپدیت دسته‌ای مستقیم روی `QuerySet` در AuditLog ثبت نمی‌شود؛ فقط
  فراخوانی `instance.delete()`/`instance.restore()` تکی پوشش داده شده.
- CI/CD (GitHub Actions) هنوز تنظیم نشده — دستورات بالا باید فعلاً به‌صورت
  دستی قبل از هر PR اجرا شوند.
- `AI_ENABLED` در نمونهٔ `.env` خاموش است و provider واقعی تا واردکردن امن
  تنظیمات env و آزمون دسترسی staging فعال نمی‌شود. دسترسی شبکهٔ هاست مقصد به
  provider و زمان‌بندی cron برای purge audit/تولید خلاصه باید در staging/production
  تنظیم و پایش شوند.
