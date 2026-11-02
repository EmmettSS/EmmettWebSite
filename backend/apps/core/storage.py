"""نگه‌داشت فایل‌های استاتیک پروداکشن سازگار با WhiteNoise و Jazzmin."""

from __future__ import annotations

from whitenoise.storage import CompressedManifestStaticFilesStorage  # type: ignore[import-untyped]


class NonStrictCompressedManifestStaticFilesStorage(
    CompressedManifestStaticFilesStorage  # type: ignore[misc]
):
    """فشرده‌سازی و نام‌گذاری هش‌دار WhiteNoise با بازگشت ایمن روی مسیر پوشه.

    قالب پایهٔ ``django-jazzmin`` عبارت ``{% static "vendor/bootswatch" %}`` را روی
    یک پوشه فراخوانی می‌کند و ``collectstatic`` پوشه‌ها را در ``staticfiles.json``
    ثبت نمی‌کند؛ در ``stored_name`` فایل‌های واقعی همچنان نام هش‌شدهٔ مانیفست را
    می‌گیرند و مسیرهای پوشه‌ای یا مانیفست‌نشده بدون کرش ``ValueError``/``OSError``
    به مسیر تمیز اصلی بازمی‌گردند.
    """

    manifest_strict = False

    def stored_name(self, name: str) -> str:
        try:
            return str(super().stored_name(name))
        except (ValueError, OSError):
            return str(self.clean_name(name))
