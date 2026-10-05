"""ابزار مشترک فیدهای RSS (فاز ۷ — ADR-0031).

``?language=`` در جنگو پیش‌فرض اثر ندارد (فقط ``/en/`` در URL، کوکی زبان و هدر
``Accept-Language`` بررسی می‌شوند). چون فید در مسیر ``/api/v1/...`` و بدون
پیشوند زبان سرو می‌شود، کلاینت فقط می‌تواند هدر یا پارامتر بدهد؛ این mixin
اجازهٔ هر دو را می‌دهد و زبان را فقط در محدودهٔ همان درخواست تغییر می‌دهد
(``translation.override``) تا تردهای مشترک وب‌سرور آلوده نشوند.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.http import HttpRequest
from django.utils import translation


class LocalizedFeedMixin:
    """زبان فید را از ``?language=`` (و در نبود آن ``Accept-Language``) می‌گیرد.

    ``__call__`` بازنویسی می‌شود (نه ``get_object``) چون تولید نشانه‌ها و
    ``item_link``ها بعد از ``get_object`` و در همان درخواست انجام می‌شود؛ اگر
    ``translation.override`` فقط دور ``get_object`` باشد، لینک‌ها به زبان
    پیش‌فرض برمی‌گردند (باگ کشف‌شده در تست فاز ۷).
    """

    def __call__(self, request: HttpRequest, *args: Any, **kwargs: Any) -> Any:
        requested = str(request.GET.get("language", "") or "").strip().lower()
        available = {code.lower() for code, _label in settings.LANGUAGES}
        if requested and requested in available:
            with translation.override(requested):
                return super().__call__(request, *args, **kwargs)  # type: ignore[misc]
        return super().__call__(request, *args, **kwargs)  # type: ignore[misc]


__all__ = ["LocalizedFeedMixin"]
