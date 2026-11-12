"""تنظیمات تست مخصوص CI — لایهٔ CI، بدون تغییر storage محیط محصول (ADR-0038).

جاب ``backend-test`` نباید برای رندر قالب‌ها اجرای ``collectstatic`` یا ساختن
مانیفست استاتیک را لازم داشته باشد. در این تنظیم فقط backend کلید
``staticfiles`` به ``StaticFilesStorage`` ساده تغییر می‌کند تا تگ‌های
``{% static %}`` در تست‌ها به مسیرهای معمولی تبدیل شوند. کلید ``default``
عمداً همان storage فایل‌های کاربر باقی می‌ماند؛ بنابراین رفتار آپلودها و تنظیم
فشرده/هش‌شدهٔ محیط محصول تغییر نمی‌کند.

این فایل فقط در جاب ``backend-test`` با
``PYTHONPATH=<repo>/.github/ci`` و ``DJANGO_SETTINGS_MODULE=ci_test_settings``
بارگذاری می‌شود. محیط توسعه، production و Passenger از تنظیمات واقعی
``config.settings.dev`` / ``config.settings.production`` استفاده می‌کنند.
"""

from config.settings.dev import *  # noqa: F401,F403,F405

# ``STATICFILES_STORAGE`` (تنظیم میراثی) هم‌زمان با ``STORAGES`` به‌روز می‌شود
# تا هر دو منبع سازگار بمانند و خواننده دچار ابهام نشود.
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

STORAGES = {
    **STORAGES,  # noqa: F405 - کلید ``default`` (FileSystemStorage) حفظ می‌شود.
    "staticfiles": {"BACKEND": STATICFILES_STORAGE},
}
