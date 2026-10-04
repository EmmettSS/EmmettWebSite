# Emmett — Backend

پروژهٔ Django 5.2 + DRF که API نسخه‌دار (`/api/v1/`) سایت امیت را سرو
می‌کند. معماری کلان (Modular Monolith، مرزبندی اپ‌ها، i18n، احراز هویت و...)
در `../ARCHITECTURE.md` و `docs/adr/0001` تا `0025` مستند شده؛ این فایل فقط
راهنمای عملی توسعهٔ محلی است.

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
| `api` | بدون مدل؛ فقط ترکیب URLهای بالا زیر `/api/v1/` + OpenAPI | — |

`ai_engine` (دستیار هوشمند کشف نیاز + ابزار کمک‌محتوا) در `ARCHITECTURE.md`
و `ADR-0009` **طراحی شده** اما عمداً پیاده‌سازی **نشده** — این دامنه به فاز ۵
موکول شده (نیاز به تصمیم دربارهٔ ارائه‌دهندهٔ AI/کلید API دارد که خارج از
scope فازهای ۰ تا ۴ است).

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
  (`apps/core/throttling.py`) روی فرم تماس، auth، عضویت خبرنامه (`ADR-0006`).
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
- `ai_engine` (بالا توضیح داده شد) پیاده‌سازی نشده؛ فاز ۵.
