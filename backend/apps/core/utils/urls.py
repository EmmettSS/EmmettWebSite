"""تولید مسیر فرانت‌اند هم‌راستا با قرارداد مسیریابی next-intl (ADR-0016).

فارسی زبان پیش‌فرض و **بدون پیشوند** است (``/projects/x``)؛ انگلیسی همیشه با
پیشوند ``/en`` است (``/en/projects/x``) — دقیقاً مطابق
``frontend/src/i18n/routing.ts`` (``localePrefix: "as-needed"``, ``defaultLocale: "fa"``).
"""

from __future__ import annotations


def localized_path(locale: str, path: str) -> str:
    """``path`` باید با ``/`` شروع شود و بدون پیشوند locale باشد (مثلاً ``/projects/x``)."""

    if not path.startswith("/"):
        path = f"/{path}"
    if locale == "fa":
        return path
    return f"/{locale}{path}"


def absolute_localized_url(locale: str, path: str) -> str:
    """URL مطلق یک مسیر بومی‌سازی‌شده روی دامنهٔ عمومی (``PUBLIC_SITE_URL``).

    در فیدهای RSS (بلاگ/آکادمی) و JSON-LD لازم است: ``<link>`` نسبی برای
    خواننده‌های فید نامعتبر است و Google برای ``item`` ساخت‌یافته URL مطلق
    می‌خواهد (ADR-0031).
    """

    from django.conf import settings

    base = str(settings.PUBLIC_SITE_URL).rstrip("/")
    return f"{base}{localized_path(locale, path)}"


__all__ = ["absolute_localized_url", "localized_path"]
