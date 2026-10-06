"""تنظیمات نهایی پروداکشن — MySQL 8، سخت‌سازی امنیتی و سازگاری با cPanel (ADR-0033، ADR-0035، ADR-0036)."""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import PUBLIC_SITE_URL, SECURITY_REFERRER_POLICY, env

# در محیط پروداکشن، DEBUG همیشه و بدون استثنا خاموش است.
DEBUG = False

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])
_default_csrf_origins = [PUBLIC_SITE_URL] if PUBLIC_SITE_URL.startswith("https://") else []
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=_default_csrf_origins)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("MYSQL_DATABASE"),
        "USER": env("MYSQL_USER"),
        "PASSWORD": env("MYSQL_PASSWORD"),
        "HOST": env("MYSQL_HOST", default="127.0.0.1"),
        "PORT": env("MYSQL_PORT", default="3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
        "CONN_MAX_AGE": env.int("MYSQL_CONN_MAX_AGE", default=60),
        "CONN_HEALTH_CHECKS": True,
    }
}

# ---------------------------------------------------------------------------
# سخت‌سازی HTTPS، HSTS، کوکی‌ها و هدرهای امنیتی (قانون ۱۶ — ADR-0033 / ADR-0036)
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = env.bool("DJANGO_SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("DJANGO_CSRF_COOKIE_SECURE", default=True)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # فرانت‌اند هم‌مبدأ مقدار کوکی را برای هدر X-CSRFToken می‌خواند
SESSION_COOKIE_SAMESITE = env("DJANGO_SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = env("DJANGO_CSRF_COOKIE_SAMESITE", default="Lax")

SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = SECURITY_REFERRER_POLICY
X_FRAME_OPTIONS = "DENY"

# در production پیش‌فرض احراز هویت دو مرحله‌ای ادمین روشن است؛
# خاموش بودن آن توسط System Check اختصاصی ``emmett_admin.W009`` هشدار داده می‌شود.
ADMIN_2FA_REQUIRED = env.bool("ADMIN_2FA_REQUIRED", default=True)
