"""ذخیره‌سازی استاتیک فشرده با بازگشت برای مسیرهای خارج از مانیفست."""

from __future__ import annotations

from whitenoise.storage import CompressedManifestStaticFilesStorage  # type: ignore[import-untyped]


class NonStrictCompressedManifestStaticFilesStorage(
    CompressedManifestStaticFilesStorage  # type: ignore[misc]
):
    """نام‌گذاری هش‌دار WhiteNoise با بازگشت ایمن روی مسیرهای مانیفست‌نشده."""

    manifest_strict = False

    def stored_name(self, name: str) -> str:
        try:
            return str(super().stored_name(name))
        except (ValueError, OSError):
            return str(self.clean_name(name))
