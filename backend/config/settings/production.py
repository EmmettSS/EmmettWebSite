"""تنظیمات پروداکشن — MySQL، سخت‌سازی امنیتی (تکمیل نهایی در فاز Security)."""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import SECURITY_REFERRER_POLICY, env

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("MYSQL_DATABASE"),
        "USER": env("MYSQL_USER"),
        "PASSWORD": env("MYSQL_PASSWORD"),
        "HOST": env("MYSQL_HOST", default="127.0.0.1"),
        "PORT": env("MYSQL_PORT", default="3306"),
        "OPTIONS": {"charset": "utf8mb4"},
        "CONN_MAX_AGE": 60,
    }
}

SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = env.bool("DJANGO_SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("DJANGO_CSRF_COOKIE_SECURE", default=True)
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = SECURITY_REFERRER_POLICY
# در production پیش‌فرض دو مرحله‌ای روشن است (با env قابل خاموش‌کردن برای
# گذار اولیه)؛ check اختصاصی ``emmett_admin.W008`` خاموش‌بودن آن را هشدار می‌دهد.
ADMIN_2FA_REQUIRED = env.bool("ADMIN_2FA_REQUIRED", default=True)
