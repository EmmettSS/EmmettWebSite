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


__all__ = ["localized_path"]
