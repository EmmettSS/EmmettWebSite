"""تنظیمات تست مخصوص CI — لایهٔ CI، بدون هیچ تغییری در کد بک‌اند (ADR-0038).

چرا این فایل لازم است؟
------------------------
``config/settings/base.py`` برای کلید ``staticfiles`` از
``whitenoise.storage.CompressedManifestStaticFilesStorage`` استفاده می‌کند. این
storage هنگام رندر هر ``{% static %}`` نام هش‌شدهٔ دارایی را از مانیفست
``staticfiles.json`` می‌خواند. قالب‌های ``django-jazzmin`` در داشبورد ادمین
عبارت ``{% static "vendor/bootswatch" %}`` را روی یک **پوشه** (نه فایل) صدا
می‌زنند؛ ``collectstatic`` پوشه را در مانیفست ثبت نمی‌کند، پس رندر داشبورد
ادمین در محیط تست با این خطا می‌شکند::

    ValueError: Missing staticfiles manifest entry for 'vendor/bootswatch'

نتیجه بدون این لایه: ۳۵ تست ادمین/قالب قرمز می‌شوند، در حالی که خودِ
اپلیکیشن سالم است (خطا فقط در مسیر تست و به‌خاطر مانیفست است).

راه‌حل و مرزهای آن
-------------------
تنها کلید ``staticfiles`` به ``StaticFilesStorage`` ساده (بدون مانیفست)
تغییر می‌کند. کلید ``default`` عمداً دست‌نخورده می‌ماند چون storage
آپلودهای کاربری (``core.Media``) است و تغییرش رفتار تست‌های آپلود را
جعلی می‌کرد.

این فایل **فقط** در جاب ``backend-test`` با
``PYTHONPATH=<repo>/.github/ci`` و ``DJANGO_SETTINGS_MODULE=ci_test_settings``
بارگذاری می‌شود. هیچ محیط دیگری (توسعهٔ محلی، production، Passenger) آن را
نمی‌بیند، و هیچ فایل ``backend/`` را تغییر نمی‌دهد — همان اصل ADR-0037:
مشکل از لایهٔ CI حل می‌شود، نه با دست‌کاری کد محصول.
"""

from config.settings.dev import *  # noqa: F401,F403,F405

# ``STATICFILES_STORAGE`` (تنظیم میراثی) هم‌زمان با ``STORAGES`` به‌روز می‌شود
# تا هر دو منبع سازگار بمانند و خواننده دچار ابهام نشود.
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

STORAGES = {
    **STORAGES,  # noqa: F405 - کلید ``default`` (FileSystemStorage) حفظ می‌شود.
    "staticfiles": {"BACKEND": STATICFILES_STORAGE},
}
