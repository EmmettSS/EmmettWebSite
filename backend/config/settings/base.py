"""تنظیمات مشترک بین محیط توسعه و پروداکشن.

هیچ مقدار محرمانه‌ای در این فایل hard-code نمی‌شود (قانون ۵). همهٔ مقادیر حساس یا
وابسته به محیط از طریق ``django-environ`` و فایل ``.env`` خوانده می‌شوند.
"""

from __future__ import annotations

from pathlib import Path

import environ
from import_export.formats import base_formats

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
    "import_export",
    # دو مرحله‌ای‌سازی اختیاری ادمین (فاز ۷، ADR-0033). پکیج سبک است و فقط
    # مدل‌های دستگاه (TOTP/Static) و verify/otp_required را می‌آورد؛
    # پیاده‌سازی خودی رمزنگارانه انجام نمی‌شود (دلیل در ADR-0033).
    "django_otp",
    "django_otp.plugins.otp_totp",
    "django_otp.plugins.otp_static",
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
    # ``OTPMiddleware`` صفت ``is_verified()`` را به کاربر و ``otp_device`` را
    # به request اضافه می‌کند؛ بدون آن اجبار ۲FA ادمین قابل تشخیص نیست.
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # سخت‌سازی هدرهای امنیتی (CSP/Referrer/Permissions) برای پاسخ‌های جنگو —
    # فرانت‌اند CSP خودش را با nonce در ``frontend/src/proxy.ts`` می‌سازد
    # (ADR-0033). جای این middleware قبل از کلیک‌جکینگ نیست؛ هر جای پس از
    # AuthenticationMiddleware کار می‌کند، ولی اینجا نگه داشته شده تا در
    # ``process_response`` (برعکس ترتیب درخواست) دیرترین هدرها را بنویسد.
    "apps.core.middleware.SecurityHeadersMiddleware",
    # توقف brute-force فرم ورود ادمین (۴۲۹ + Retry-After) — پیش از ۲FA، چون
    # اولین قدم حمله همان فرم ورود است.
    "apps.core.middleware.AdminLoginLockoutMiddleware",
    # اجبار دو مرحله‌ای ادمین (پس از احراز هویت و پیام‌ها؛ قبل از ریدایرکت).
    "apps.core.middleware.AdminTwoFactorMiddleware",
    # نگاشت ۳۰۱/۳۰۲/۴۱۰ مدیریت‌شده از ادمین: فقط برای مسیرهایی که جنگو خودش
    # ۴۰۴ می‌دهد (ادمین/مدیا/API قدیمی). ویترین عمومی توسط Next.js و
    # ``frontend/src/proxy.ts`` ریدایرکت می‌شود (ADR-0031).
    "apps.core.middleware.RedirectFallbackMiddleware",
    "django_structlog.middlewares.RequestMiddleware",
]

ROOT_URLCONF = "config.urls"
# cPanel's Python Passenger app is mounted under /backend while Next.js owns /
# (ADR-0035). Normalize the value and keep local development at the domain root.
_script_prefix = env("DJANGO_FORCE_SCRIPT_NAME", default="").strip().strip("/")
FORCE_SCRIPT_NAME = f"/{_script_prefix}" if _script_prefix else None

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # قالب‌های این پوشه بر قالب‌های اپ‌ها اولویت دارند — قرارداد رسمی Django.
        "DIRS": [BASE_DIR / "templates"],
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
# Static / Media (ADR-0005, ADR-0036)
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = Path(env("DJANGO_STATIC_ROOT", default=str(BASE_DIR / "staticfiles")))
# دارایی‌های استاتیک خودِ پروژه (برند، تم بومی ادمین، فونت) — خارج از پوشهٔ اپ‌ها
# (مهاجرت به پوستهٔ بومی، ADR-0043). در production با ``collectstatic`` در
# ``STATIC_ROOT`` جمع می‌شوند و با WhiteNoise یا مستقیم توسط Apache سرو می‌شوند.
STATICFILES_DIRS = [BASE_DIR / "static"]
STATICFILES_STORAGE = "apps.core.storage.NonStrictCompressedManifestStaticFilesStorage"
# ``modeltranslation.TabbedTranslationAdmin`` defaults to Google-hosted jQuery
# and jQuery UI URLs. Keep its optional translation tabs compatible with the
# self-only Admin CSP by using Django's bundled jQuery and a self-hosted jQuery UI.
JQUERY_URL = "admin/js/vendor/jquery/jquery.min.js"
JQUERY_UI_URL = "admin_theme/js/vendor/jquery-ui-1.13.3.min.js"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": STATICFILES_STORAGE,
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("DJANGO_MEDIA_ROOT", default=str(BASE_DIR / "media")))

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
            "LOCATION": env("CACHE_LOCATION", default=str(BASE_DIR / ".cache" / "django-cache")),
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

# Next.js on-demand cache invalidation. When the webhook is not configured,
# frontend data fetches still recover through their explicit short TTL.
FRONTEND_REVALIDATE_URL = env("FRONTEND_REVALIDATE_URL", default="")
FRONTEND_REVALIDATE_SECRET = env("FRONTEND_REVALIDATE_SECRET", default="")
FRONTEND_REVALIDATE_TIMEOUT_SECONDS = env.int("FRONTEND_REVALIDATE_TIMEOUT_SECONDS", default=2)

# ---------------------------------------------------------------------------
# Service-to-service authentication (ADR-0041)
# ---------------------------------------------------------------------------
# Next.js (Server Components / ISR / the same-origin proxy) calls this API from
# the same machine. Every such call shares one loopback "anonymous" identity,
# so the 100/hour anonymous throttle used to turn page rendering into silent
# 429s (pages rendered empty). When this token matches the ``X-Internal-Token``
# header, the *default* anonymous/user throttles are skipped (scoped user-action
# throttles — contact, AI, auth, newsletter — are NOT bypassed).
# Keep empty to disable the bypass; use a 50+ char random value in production.
INTERNAL_API_TOKEN = env("INTERNAL_API_TOKEN", default="")

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
# Email (fallback — کانال اصلی اعلان Kavenegar است؛ ر.ک. DISCOVERY.md و ADR-0036)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@emmett.example")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

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
        "apps.core.throttling.ProxyAwareAnonRateThrottle",
        "apps.core.throttling.ProxyAwareUserRateThrottle",
    ],
    # تعداد reverse proxyهای مطمئن جلوتر از اپلیکیشن:
    # - 1 (پیش‌فرض): Apache/Passenger روی هاست cPanel هدر X-Forwarded-For را ست/اضافه
    #   می‌کند و پراکسی داخلی Next.js آن را بدون افزودن 127.0.0.1 عبور می‌دهد.
    # - 2: زمانی که CDN خارجی (Cloudflare/ArvanCloud) بدون mod_remoteip جلوتر از Apache است
    #   و Apache از RequestHeader append استفاده می‌کند.
    # - 0: اتصال مستقیم بدون پراکسی (نادیده‌گرفتن کامل هدرهای X-Forwarded-For).
    # پیش از ترافیک واقعی، خروجی تشخیصی /api/v1/health/proxy/ را روی هاست بررسی کنید.
    "NUM_PROXIES": env.int("DJANGO_NUM_PROXIES", default=1),
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

PUBLIC_SITE_URL = env("PUBLIC_SITE_URL", default="http://localhost:3000")
ADMIN_DASHBOARD_CACHE_SECONDS = env.int("ADMIN_DASHBOARD_CACHE_SECONDS", default=120)

# ---------------------------------------------------------------------------
# صادرات/واردات داده (فاز ۶، ADR-0029) — django-import-export
# ---------------------------------------------------------------------------
# - تراکنشی: واردات ناقص نباید داده را نیمه‌کاره رها کند.
# - escape فرمول‌ها هنگام صادرات: جلوگیری از CSV/formula injection در Excel
#   (کاربر ادمین فایل را در Excel باز می‌کند و محتوای لید می‌تواند با «=» شروع شود).
# - LogEntry ادمین برای import/export فعال می‌ماند (رد حسابرسی).
# - مجوز صادرات = «view» و واردات = «add» تا بدون تعریف مجوز سفارشی کار کند.
# فهرست فرمت‌های مجاز: ``base_formats.DEFAULT_FORMATS`` شامل XLSX/ODS/YAML است
# که tablib بدون extras (openpyxl/odfpy/pyyaml) در زمان رندر خطای
# ``UnsupportedFormat`` می‌دهد و در هاست اشتراکی هدف هم وابستگی اضافه نمی‌خواهیم
# (ADR-0029). پس فقط سه فرمت «همه‌جا کارکن» مجاز است:
#   CSV  → گزارش‌گیری در Excel/Google Sheets
#   TSV  → فایل‌های تمیز برای پردازش خط فرمان
#   JSON → پشتیبان‌گیری ساختاریافته/مهاجرت داده
IMPORT_EXPORT_FORMATS = (base_formats.CSV, base_formats.JSON, base_formats.TSV)

IMPORT_EXPORT_USE_TRANSACTIONS = True
IMPORT_EXPORT_ESCAPE_FORMULAE_ON_EXPORT = True
IMPORT_EXPORT_ESCAPE_ILLEGAL_CHARS_ON_EXPORT = True
IMPORT_EXPORT_SKIP_ADMIN_LOG = False
IMPORT_EXPORT_EXPORT_PERMISSION_CODE = "view"
IMPORT_EXPORT_IMPORT_PERMISSION_CODE = "add"
IMPORT_EXPORT_IMPORT_IGNORE_BLANK_LINES = True

# ---------------------------------------------------------------------------
# SEO (فاز ۷ — ADR-0031)
# ---------------------------------------------------------------------------
# صفحه‌های ثابت ویترین که در sitemap می‌آیند و «مسیر بومی‌سازی‌نشده» دارند
# (پیشوند ``/en`` را فرانت‌اند اضافه می‌کند). ترتیب، اولویت/تناوب را تعیین می‌کند.
#
# صفحه‌های جزئیات اینجا نمی‌آیند: آن‌ها را ``apps/core/seo.py::_published_entries``
# از رکوردهای منتشرشده می‌سازد و برای همهٔ پروژه‌ها — از جمله محصولات با
# ``is_product=True`` — پیشوند ``/projects/`` را به کار می‌برد. این قرارداد
# canonical است (ADR-0040): در فرانت‌اند هم صفحهٔ جزئیات محصول زیر
# ``/projects/{slug}`` سرو می‌شود و فهرست محصولات هم به همان‌جا لینک می‌دهد.
#
# ``/products/{slug}`` **عمداً** در این فهرست نیست. در فرانت‌اند آن مسیرها
# صفحهٔ «به‌زودی»ِ پورت UI هستند (ADR-0037)، محتوای دیتابیسی ندارند و
# canonicalِ خودشان را نگه می‌دارند؛ فرستادنشان در sitemap یعنی معرفی یک
# صفحهٔ خالی به موتور جست‌وجو و تناقض دوباره با canonical صفحهٔ واقعی.
SEO_STATIC_PAGES: tuple[tuple[str, str, str], ...] = (
    ("/", "1.0", "weekly"),
    ("/services", "0.9", "weekly"),
    ("/projects", "0.9", "weekly"),
    ("/products", "0.7", "monthly"),
    ("/academy", "0.9", "weekly"),
    ("/blog", "0.9", "daily"),
    ("/about", "0.6", "monthly"),
    ("/contact", "0.6", "monthly"),
    ("/design-system", "0.2", "yearly"),
)
# مسیرهایی که هرگز نباید ایندکس شوند (در robots.txt و متاتگ noindex استفاده می‌شود).
SEO_NOINDEX_PATHS: tuple[str, ...] = (
    "/profile",
    "/search",
    "/advisor",
    "/estimate",
    "/admin",
    "/api",
    "/i18n",
    "/media",
)
SEO_SITEMAP_CACHE_SECONDS = env.int("SEO_SITEMAP_CACHE_SECONDS", default=900)
SEO_REDIRECTS_CACHE_SECONDS = env.int("SEO_REDIRECTS_CACHE_SECONDS", default=300)
# شمارش بازدید ریدایرکت‌ها روی هاست اشتراکی یک نوشتن اضافه در هر درخواست است؛
# پیش‌فرض روشن است چون جدول کوچک و ایندکس‌دار است، ولی قابل خاموش‌کردن.
SEO_COUNT_REDIRECT_HITS = env.bool("SEO_COUNT_REDIRECT_HITS", default=True)

# ---------------------------------------------------------------------------
# Security headers (فاز ۷ — ADR-0033)
# ---------------------------------------------------------------------------
# CSP سراسری برای پاسخ‌های جنگو (API/ادمین). فرانت‌اند Next.js سیاست
# nonce-based خودش را در ``src/proxy.ts`` می‌سازد.
CSP_ENABLED = env.bool("DJANGO_CSP_ENABLED", default=True)
CSP_REPORT_ONLY = env.bool("DJANGO_CSP_REPORT_ONLY", default=False)
CSP_REPORT_URI = env("DJANGO_CSP_REPORT_URI", default="")
# ``frame-ancestors`` در dev باز می‌ماند تا پیش‌نمایش داخل iframe کار کند؛ در
# production با DJANGO_FRAME_ANCESTORS='none' قفل می‌شود.
# توجه: مقدار خالی در ``.env`` (همان حالتی که ``.env.example`` دارد) نباید به
# دایرکتیو تهی ``frame-ancestors`` منجر شود؛ ``env.list`` برای رشتهٔ خالی
# لیست خالی برمی‌گرداند، پس صریحاً به پیش‌فرض dev/prod برمی‌گردیم. اگر قرار است
# هیچ دامنه‌ای مجاز نباشد، مقدار صریح ``'none'`` باید ست شود.
_DEFAULT_CSP_FRAME_ANCESTORS = ["'self'"] if DEBUG else ["'none'"]
CSP_FRAME_ANCESTORS = env.list("DJANGO_FRAME_ANCESTORS", default=[]) or _DEFAULT_CSP_FRAME_ANCESTORS
CSP_EXTRA_IMG_SRC = env.list("DJANGO_CSP_IMG_SRC", default=[])
SECURITY_REFERRER_POLICY = env("DJANGO_REFERRER_POLICY", default="strict-origin-when-cross-origin")
SECURITY_PERMISSIONS_POLICY = env(
    "DJANGO_PERMISSIONS_POLICY", default="camera=(), microphone=(), geolocation=()"
)

# ---------------------------------------------------------------------------
# محافظت از ورود (lockout) — فاز ۷، ADR-0033
# ---------------------------------------------------------------------------
LOGIN_LOCKOUT_ENABLED = env.bool("LOGIN_LOCKOUT_ENABLED", default=True)
LOGIN_LOCKOUT_MAX_ATTEMPTS = env.int("LOGIN_LOCKOUT_MAX_ATTEMPTS", default=5)
LOGIN_LOCKOUT_WINDOW_SECONDS = env.int("LOGIN_LOCKOUT_WINDOW_SECONDS", default=900)
LOGIN_LOCKOUT_DURATION_SECONDS = env.int("LOGIN_LOCKOUT_DURATION_SECONDS", default=900)

# ---------------------------------------------------------------------------
# دو مرحله‌ای‌سازی ادمین (فاز ۷، ADR-0033)
# ---------------------------------------------------------------------------
# اختیاری برای کاربر، ولی وقتی روشن باشد همهٔ staff باید دستگاه تأییدشده داشته
# باشند. در production پیش‌فرض روشن است (ر.ک. production.py).
ADMIN_2FA_REQUIRED = env.bool("ADMIN_2FA_REQUIRED", default=False)
ADMIN_2FA_ISSUER = env("ADMIN_2FA_ISSUER", default="Emmett")
# django-otp نام صادرکننده را فقط از این تنظیم در URL ``otpauth://`` می‌گذارد؛
# بدون آن، اپلیکیشن Authenticator فقط ایمیل کاربر را نشان می‌دهد (کشف‌شده در تست).
OTP_TOTP_ISSUER = ADMIN_2FA_ISSUER
ADMIN_2FA_RECOVERY_CODE_COUNT = env.int("ADMIN_2FA_RECOVERY_CODE_COUNT", default=8)

# ---------------------------------------------------------------------------
# پشتیبان‌گیری (فاز ۷ — ADR-0033)
# ---------------------------------------------------------------------------
BACKUP_DIR = env("BACKUP_DIR", default=str(BASE_DIR / "backups"))
BACKUP_RETENTION = env.int("BACKUP_RETENTION", default=7)
BACKUP_INCLUDE_MEDIA = env.bool("BACKUP_INCLUDE_MEDIA", default=True)

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
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
    "loggers": {
        "django": {
            "handlers": [],
            "level": env("DJANGO_LOG_LEVEL", default="INFO"),
            "propagate": True,
        },
        "django_structlog": {
            "handlers": [],
            "level": "INFO",
            "propagate": True,
        },
        "apps": {
            "handlers": [],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": True,
        },
    },
}
