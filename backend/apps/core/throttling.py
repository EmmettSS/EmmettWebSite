"""کلاس‌های Throttle اختصاصی برای endpointهای حساس.

نرخ‌های واقعی در ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` (تنظیمات) و از
طریق متغیرهای محیطی قابل‌تغییرند. این کلاس‌ها روی ``throttle_classes`` یک
APIView گذاشته می‌شوند — مثلاً ``throttle_classes = [AuthRateThrottle]``.

نکتهٔ مهم (باگ رفع‌شده): ``rest_framework.throttling.ScopedRateThrottle``
در پیاده‌سازی استاندارد DRF مقدار scope را از خودِ **view** می‌خواند
(``getattr(view, "throttle_scope", None)``)، نه از attribute کلاس throttle.
اگر این override انجام نشود، تنظیم ``scope = "..."`` روی زیرکلاس عملاً
بی‌اثر است و ``allow_request`` همیشه ``True`` برمی‌گرداند (محدودیتی اعمال
نمی‌شود) — چون هیچ‌کدام از viewهای این پروژه ``throttle_scope`` را مستقیماً
تنظیم نکرده بودند. برای اینکه بتوان کلاس‌های نام‌گذاری‌شدهٔ مجزا (خواناتر از
تنظیم دستی ``throttle_scope`` در هر view) داشت، ``allow_request`` اینجا
override شده تا ``view.throttle_scope`` را از attribute کلاس خودش ست کند.
"""

from __future__ import annotations

from typing import Any

from rest_framework.throttling import ScopedRateThrottle


class _NamedScopedRateThrottle(ScopedRateThrottle):
    """پایهٔ مشترک: scope را از attribute کلاس (نه از view) می‌خواند."""

    scope: str

    def allow_request(self, request: Any, view: Any) -> bool:
        # ScopedRateThrottle.allow_request مقدار self.scope را از
        # ``getattr(view, "throttle_scope", None)`` بازنویسی می‌کند؛ با ست‌کردن
        # آن روی خودِ view پیش از فراخوانی super()، نیازی به تکرار
        # ``throttle_scope = "..."`` در تک‌تک کلاس‌های APIView نیست.
        view.throttle_scope = self.scope
        return super().allow_request(request, view)


class ContactFormRateThrottle(_NamedScopedRateThrottle):
    scope = "contact_form"


class AIEngineRateThrottle(_NamedScopedRateThrottle):
    scope = "ai_engine"


class AuthRateThrottle(_NamedScopedRateThrottle):
    scope = "auth"


class NewsletterRateThrottle(_NamedScopedRateThrottle):
    scope = "newsletter"
