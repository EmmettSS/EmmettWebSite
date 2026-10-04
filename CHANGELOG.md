# Changelog

فرمت این فایل بر اساس [Keep a Changelog](https://keepachangelog.com/) است. هر فاز پروژه یک بخش مستقل دارد.

## [فاز ۲] — Backend Foundation — 2026-10-04

### افزوده‌شده

- اسکلت کامل پروژهٔ Django در `backend/`: تنظیمات سه‌لایه (`config/settings/base.py`, `dev.py`, `production.py`)، `urls.py`/`wsgi.py`/`asgi.py`/`manage.py`.
- Custom User Model (`apps/accounts/models.py`) با `email` به‌جای `username`، نقش‌های `admin/editor/student/client`، `phone`/`is_phone_verified` (آماده برای OTP آینده)، `public_id` (UUID).
- `BaseModel` مشترک در `apps/core/models.py`: `created_at`, `updated_at`, `is_active`, soft delete (`delete(hard=False)`/`restore()`) + `BaseManager`/`AllObjectsManager`/`BaseQuerySet` اختصاصی.
- مدل `AuditLog` (با `GenericForeignKey`) و تابع کمکی `log_action(...)` برای ثبت متمرکز رویدادهای حساس (قانون ۱۶).
- لایهٔ DRF مشترک: `StandardResultsSetPagination` (envelope یکنواخت)، `custom_exception_handler` (envelope خطای یکنواخت + لاگ ساختاریافته)، سه کلاس throttle (`contact_form`, `ai_engine`, `auth`).
- مستندسازی خودکار API با `drf-spectacular` (`/api/v1/schema/`, `/swagger-ui/`, `/redoc/`).
- `HealthCheckView` در `/api/v1/health/` (بررسی دیتابیس + کش، عمومی/بدون auth).
- لاگ ساختاریافته با `structlog` + `django-structlog` (JSON در production، کنسول خوانا در dev، `request_id` خودکار).
- پیکربندی ابزار: `backend/pyproject.toml` (mypy strict + ruff)، `backend/pytest.ini` (pytest-django).
- تست‌های پایه (۲۸ تست، پوشش ۹۶٪ روی `apps/core`/`apps/accounts`) با `pytest-django` + `factory-boy` (`UserFactory`).
- اولین migrationها (`apps/accounts/migrations/0001_initial.py`, `apps/core/migrations/0001_initial.py`) تولید و روی SQLite اعتبارسنجی شدند.
- `.gitignore` ریشهٔ ریپو (پوشش فرانت‌اند و بک‌اند: `node_modules/`, `dist/`, `backend/.venv/`, `backend/db.sqlite3`, `backend/staticfiles/`, `.env`، کش‌های ابزار).
- پنج ADR جدید: `0011` (Custom User + Session/CSRF auth)، `0012` (BaseModel/soft delete)، `0013` (طراحی AuditLog)، `0014` (لایهٔ DRF)، `0015` (لاگ ساختاریافته + ابزار تست/type-checking).

### تصمیمات کلیدی

- نسخهٔ هدف: **Python 3.11 + Django 5.2 LTS**.
- احراز هویت API: **Session + CSRF** استاندارد Django (نه JWT) — نهایی‌کنندهٔ ADR-0007.
- درایور MySQL: **PyMySQL** (خالص پایتون، بدون کامپایل C).
- `mypy==2.3.0` پین شد (نه `2.4.0`) به‌خاطر تداخل نسخه با `django-stubs[compatible-mypy]==6.1.1`.

### شناخته‌شده/باز

- تابع `log_action` فعلاً داخل `apps/core/models.py` است، نه در `apps/core/services.py` جداگانه (ر.ک. ADR-0013) — در صورت افزودن منطق سرویس‌محور دیگر به `core`، باید منتقل شود.

## [فاز ۱] — Discovery & Architecture

### افزوده‌شده

- `DISCOVERY.md`، `ARCHITECTURE.md`، و ADRهای `0001` تا `0010` (معماری کلی، مرزبندی اپ‌های Django، i18n، تاریخ/اعداد، ذخیره‌سازی رسانه، کش/rate-limit، احراز هویت (بحث اولیه)، پایپ‌لاین CRM لیدها، معماری داده موتور AI، مدیریت وابستگی).
