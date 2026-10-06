"""تنظیمات محیط توسعهٔ محلی — همیشه SQLite، DEBUG فعال.

فاز ۶ (ADR-0027): این فایل طوری تنظیم شده که پنل ادمین روی «پیش‌نمایش محیط
توسعه» (دامنهٔ sandbox و نه فقط localhost) هم قابل استفاده باشد؛ موارد
امنیتی مربوط به production دست‌نخورده می‌مانند و هیچ‌کدام از این تنظیمات در
``production.py`` اعمال نمی‌شوند.
"""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import BASE_DIR, env

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# در توسعه نیازی به اجبار HTTPS/کوکی امن نیست.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

INTERNAL_IPS = ["127.0.0.1"]

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:3000", "http://127.0.0.1:3000"]
)

# ---------------------------------------------------------------------------
# پیش‌نمایش محیط توسعه (sandbox) — فقط در dev
# ---------------------------------------------------------------------------
# در محیط sandbox، اپ روی یک میزبان پروکسی‌شده با دامنهٔ پویا سرو می‌شود که از
# پیش قابل‌حدس نیست؛ بدون این تنظیم، ``DisallowedHost`` و خطای
# «CSRF origin checking failed» مانع مشاهدهٔ پنل ادمین می‌شود. هر دو مورد فقط
# با فعال‌سازی صریح env باز می‌شوند و production هرگز از این فایل استفاده نمی‌کند.
if env.bool("DJANGO_DEV_ALLOW_ANY_HOST", default=False):
    ALLOWED_HOSTS = ["*"]
    # هر میزبان پروکسی‌شدهٔ HTTPS در این حالت مجاز است (dev-only).
    CSRF_TRUSTED_ORIGINS = [*CSRF_TRUSTED_ORIGINS, "https://*.e2b.app", "http://localhost:8000"]  # noqa: F405
    # قاب‌بندی (iframe) پنل ادمین در پیش‌نمایش باید ممکن باشد؛ X-Frame-Options
    # تنها هدری است که مانع نمایش preview داخل iframe می‌شود. در production
    # مقدار DENY از ``base.py`` حفظ می‌شود.
    MIDDLEWARE = [
        mw
        for mw in MIDDLEWARE  # noqa: F405
        if mw != "django.middleware.clickjacking.XFrameOptionsMiddleware"
    ]
