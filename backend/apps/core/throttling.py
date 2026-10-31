"""کلاس‌های Throttle یکپارچه با استخراج امن IP واقعی کلاینت.

نرخ‌های واقعی در ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` (تنظیمات) و از
طریق متغیرهای محیطی قابل‌تغییرند. همهٔ کلاس‌های این ماژول متد ``get_ident`` را
به ``apps.core.utils.request.get_client_ip`` متصل می‌کنند تا هم محدودیت‌های نرخ
DRF، هم ``LoginLockout`` و هم ``AuditLog`` دقیقاً از یک منطق واحد (خواندن از راست
بر اساس ``REST_FRAMEWORK["NUM_PROXIES"]``، پشتیبانی از ``X-Real-IP`` و بازگشت ایمن
به ``REMOTE_ADDR`` در صورت خالی‌بودن هدر) پیروی کنند.

نکتهٔ مهم (باگ رفع‌شده): ``rest_framework.throttling.ScopedRateThrottle``
در پیاده‌سازی استاندارد DRF مقدار scope را از خودِ **view** می‌خواند
(``getattr(view, "throttle_scope", None)``)، نه از attribute کلاس throttle.
``_NamedScopedRateThrottle`` پیش از فراخوانی ``super().allow_request`` مقدار
``view.throttle_scope`` را از attribute کلاس خودش ست می‌کند تا کلاس‌های
نام‌گذاری‌شدهٔ مجزا بدون تکرار دستی روی هر view کار کنند.
"""

from __future__ import annotations

from typing import Any

from rest_framework.request import Request
from rest_framework.throttling import (
    AnonRateThrottle,
    ScopedRateThrottle,
    UserRateThrottle,
)

from apps.core.utils.request import get_client_ip


class ProxyAwareAnonRateThrottle(AnonRateThrottle):
    """Throttle پیش‌فرض کاربران ناشناس با استخراج امن IP واقعی پشت پراکسی."""

    def get_ident(self, request: Request) -> str:
        resolved = get_client_ip(request._request)
        if resolved:
            return resolved
        return str(super().get_ident(request) or "")


class ProxyAwareUserRateThrottle(UserRateThrottle):
    """Throttle پیش‌فرض کاربران (احرازهویت‌شده با شناسهٔ کاربر؛ ناشناس با IP واقعی)."""

    def get_ident(self, request: Request) -> str:
        resolved = get_client_ip(request._request)
        if resolved:
            return resolved
        return str(super().get_ident(request) or "")


class _NamedScopedRateThrottle(ScopedRateThrottle):
    """پایهٔ مشترک: scope را از attribute کلاس می‌خواند و IP را از ``get_client_ip`` می‌گیرد."""

    scope: str

    def get_ident(self, request: Request) -> str:
        resolved = get_client_ip(request._request)
        if resolved:
            return resolved
        return str(super().get_ident(request) or "")

    def allow_request(self, request: Any, view: Any) -> bool:
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
