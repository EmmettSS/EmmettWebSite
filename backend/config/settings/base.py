"""تنظیمات مشترک بین محیط توسعه و پروداکشن.

هیچ مقدار محرمانه‌ای در این فایل hard-code نمی‌شود (قانون ۵). همهٔ مقادیر حساس یا
وابسته به محیط از طریق ``django-environ`` و فایل ``.env`` خوانده می‌شوند.
"""

from __future__ import annotations

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

SECRET_KEY = env("DJANGO_SECRET_KEY", default="insecure-dev-only-secret-key-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ---------------------------------------------------------------------------
# Apps
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "django_structlog",
]

LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.taxonomy",
    "apps.company",
    "apps.services",
    "apps.portfolio",
    "apps.academy",
    "apps.blog",
    "apps.leads",
    "apps.ai_engine",
    "apps.api",
]

# «modeltranslation» باید پیش از «django.contrib.admin» بیاید، وگرنه در زمان
# autodiscover خودکار admin.py هر اپ (که از ``django.contrib.admin.apps.AdminConfig.ready``
# اجرا می‌شود)، ``TranslationAdmin`` با خطای «The model ... is not registered
# for translation» شکست می‌خورد — چون ``modeltranslation`` هنوز registry خودش
# را از ``translation.py`` هر اپ پر نکرده است. ر.ک. مستندات django-modeltranslation.
INSTALLED_APPS = ["modeltranslation"] + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_structlog.middlewares.RequestMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# i18n / l10n (قانون ۹، ۱۰، ۱۱)
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("fa", "فارسی"),
    ("en", "English"),
]
LOCALE_PATHS = [BASE_DIR / "locale"]

MODELTRANSLATION_DEFAULT_LANGUAGE = "fa"
MODELTRANSLATION_LANGUAGES = ("fa", "en")
MODELTRANSLATION_FALLBACK_LANGUAGES = ("fa", "en")

# ---------------------------------------------------------------------------
# Static / Media (ADR-0005)
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# محدودیت حجم آپلود ``core.Media`` طبق ADR-0005 — قابل تنظیم بدون دیپلوی مجدد.
MEDIA_MAX_IMAGE_SIZE_MB = env.int("MEDIA_MAX_IMAGE_SIZE_MB", default=5)
MEDIA_MAX_DOCUMENT_SIZE_MB = env.int("MEDIA_MAX_DOCUMENT_SIZE_MB", default=10)

MAX_IMAGE_UPLOAD_SIZE_MB = env.int("MAX_IMAGE_UPLOAD_SIZE_MB", default=5)
MAX_DOCUMENT_UPLOAD_SIZE_MB = env.int("MAX_DOCUMENT_UPLOAD_SIZE_MB", default=10)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Cache (ADR-0006 — بدون Redis)
# ---------------------------------------------------------------------------
CACHE_BACKEND = env("CACHE_BACKEND", default="locmem")
if CACHE_BACKEND == "filebased":
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
            "LOCATION": env("CACHE_LOCATION", default="/tmp/emmett-django-cache"),
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "emmett-locmem",
        }
    }

# ---------------------------------------------------------------------------
# CORS (فقط برای توسعهٔ محلی frontend جدا؛ در prod تنظیمات سخت‌گیرانه‌تر است)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

# ---------------------------------------------------------------------------
# Security baseline (سخت‌سازی کامل در فاز امنیت اختصاصی تکمیل می‌شود)
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("DJANGO_SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("DJANGO_CSRF_COOKIE_SECURE", default=False)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # باید توسط جاوااسکریپت فرانت برای هدر X-CSRFToken خوانده شود
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# ---------------------------------------------------------------------------
# Email (fallback — کانال اصلی اعلان Kavenegar است؛ ر.ک. DISCOVERY.md)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@emmett.example")

# --- SMS (ADR-0024) — اگر KAVENEGAR_API_KEY خالی باشد، به‌صورت خودکار
# ConsoleSMSBackend (فقط لاگ، بدون تماس شبکه‌ای واقعی) انتخاب می‌شود. ---
KAVENEGAR_API_KEY = env("KAVENEGAR_API_KEY", default="")
KAVENEGAR_SENDER = env("KAVENEGAR_SENDER", default="")
LEADS_NOTIFICATION_PHONE = env("LEADS_NOTIFICATION_PHONE", default="")
LEADS_NOTIFICATION_EMAIL = env("LEADS_NOTIFICATION_EMAIL", default="")

# ---------------------------------------------------------------------------
# AI gateway (ADR-0026) — provider secrets are supplied only via environment.
# ---------------------------------------------------------------------------
AI_ENABLED = env.bool("AI_ENABLED", default=False)
AI_API_BASE_URL = env("AI_API_BASE_URL", default="").rstrip("/")
AI_API_KEY = env("AI_API_KEY", default="")
AI_MODEL = env("AI_MODEL", default="")
AI_TIMEOUT_SECONDS = env.float("AI_TIMEOUT_SECONDS", default=15.0)
AI_CACHE_TTL_SECONDS = env.int("AI_CACHE_TTL_SECONDS", default=86400)
AI_AUDIT_RETENTION_DAYS = env.int("AI_AUDIT_RETENTION_DAYS", default=365)

# ---------------------------------------------------------------------------
# Django REST Framework (ADR-0012, ADR-0014)
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_RATE_ANON", default="100/hour"),
        "user": env("THROTTLE_RATE_USER", default="1000/hour"),
        "contact_form": env("THROTTLE_RATE_CONTACT", default="5/hour"),
        "ai_engine": env("THROTTLE_RATE_AI", default="20/hour"),
        "auth": env("THROTTLE_RATE_AUTH", default="10/hour"),
        # طبق ADR-0006 (۳ درخواست/روز/IP).
        "newsletter": env("THROTTLE_RATE_NEWSLETTER", default="3/day"),
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Emmett Group API",
    "DESCRIPTION": "API مرکزی ویترین نرم‌افزاری امیت — Django/DRF Backend",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "ENUM_NAME_OVERRIDES": {
        "LocalePreferenceEnum": [("fa", "فارسی"), ("en", "English")],
    },
}

# ---------------------------------------------------------------------------
# Structured logging (structlog + django-structlog)
# ---------------------------------------------------------------------------
import structlog  # noqa: E402

from apps.core.logging import configure_structlog  # noqa: E402

configure_structlog(debug=DEBUG)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain_console": {
            # نکته: مقدار ``()``/``processor`` باید شیء واقعی پایتون باشد، نه
            # رشتهٔ dotted-path؛ ``logging.config.dictConfig`` کلیدهای دیگر
            # (غیر از خودِ ``()``) را resolve نمی‌کند و رشته را عیناً به‌عنوان
            # kwarg پاس می‌دهد — قبلاً این باعث ``TypeError: 'str' object is
            # not callable`` در هر لاگ درخواست می‌شد (هرگز قبل از نوشتن تست
            # واقعی لمس نشده بود).
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.dev.ConsoleRenderer() if DEBUG else structlog.processors.JSONRenderer(),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "plain_console",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": env("DJANGO_LOG_LEVEL", default="INFO"),
        },
        "django_structlog": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
        },
    },
}
