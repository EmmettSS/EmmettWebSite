"""تنظیمات محیط توسعهٔ محلی — همیشه SQLite، DEBUG فعال."""

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
