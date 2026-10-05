"""ابزار مشترک فیدهای RSS (فاز ۷ — ADR-0031).

``?language=`` در جنگو پیش‌فرض اثر ندارد (فقط ``/en/`` در URL، کوکی زبان و هدر
``Accept-Language`` بررسی می‌شوند). چون فید در مسیر ``/api/v1/...`` و بدون
پیشوند زبان سرو می‌شود، کلاینت فقط می‌تواند هدر یا پارامتر بدهد؛ این mixin
اجازهٔ هر دو را می‌دهد و زبان را فقط در محدودهٔ همان درخواست تغییر می‌دهد
(``translation.override``) تا تردهای مشترک وب‌سرور آلوده نشوند.
"""

from __future__ import annotations

from typing import Any, cast

from django.conf import settings
from django.http import HttpRequest
from django.utils import translation

from apps.core.utils.urls import absolute_localized_url


class LocalizedFeedMixin:
    """زبان فید را از ``?language=`` (و در نبود آن ``Accept-Language``) می‌گیرد.

    ``__call__`` بازنویسی می‌شود (نه ``get_object``) چون تولید نشانه‌ها و
    ``item_link``ها بعد از ``get_object`` و در همان درخواست انجام می‌شود؛ اگر
    ``translation.override`` فقط دور ``get_object`` باشد، لینک‌ها به زبان
    پیش‌فرض برمی‌گردند (باگ کشف‌شده در تست فاز ۷).
    """

    #: مسیر عمومی فید در سایت (Next.js) برای ``atom:link rel="self"``؛ در هر
    #: فید مقدار می‌گیرد (مثلاً ``/blog/rss``) و با زبان همان درخواست ساخته می‌شود.
    public_feed_path: str = ""

    def _locale(self) -> str:  # pragma: no cover - در زیرکلاس‌ها پیاده می‌شود
        """زبان جاری فید (زیرکلاس‌ها با ``get_language()`` پیاده می‌کنند)."""

        raise NotImplementedError

    def feed_url(self, obj: Any) -> str | None:
        """``atom:link rel="self"`` با URL عمومی ساخته می‌شود.

        پیش‌فرض جنگو ``request.build_absolute_uri()`` است؛ در استقرار پشت
        پروکسی/داخلی این یعنی نوشتن دامنهٔ داخلی (مثل ``127.0.0.1:8000``) در
        فید و اتکا به هدر قابل‌جعل ``Host``. طبق ADR-0031 همهٔ URLهای مطلق از
        ``PUBLIC_SITE_URL`` ساخته می‌شوند.
        """

        if not self.public_feed_path:
            return cast("str | None", super().feed_url(obj))  # type: ignore[misc]
        return absolute_localized_url(self._locale(), self.public_feed_path)

    def __call__(self, request: HttpRequest, *args: Any, **kwargs: Any) -> Any:
        requested = str(request.GET.get("language", "") or "").strip().lower()
        available = {code.lower() for code, _label in settings.LANGUAGES}
        if requested and requested in available:
            with translation.override(requested):
                return super().__call__(request, *args, **kwargs)  # type: ignore[misc]
        return super().__call__(request, *args, **kwargs)  # type: ignore[misc]


__all__ = ["LocalizedFeedMixin"]
