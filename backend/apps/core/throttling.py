"""کلاس‌های Throttle اختصاصی برای endpointهای حساس.

نرخ‌های واقعی در ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` (تنظیمات) و از
طریق متغیرهای محیطی قابل‌تغییرند؛ این فایل فقط scopeهای نام‌گذاری‌شده را
تعریف می‌کند تا در فازهای بعدی (leads, ai_engine, accounts) مستقیماً روی
ViewSet/APIView مربوطه استفاده شوند.
"""

from __future__ import annotations

from rest_framework.throttling import ScopedRateThrottle


class ContactFormRateThrottle(ScopedRateThrottle):
    scope = "contact_form"


class AIEngineRateThrottle(ScopedRateThrottle):
    scope = "ai_engine"


class AuthRateThrottle(ScopedRateThrottle):
    scope = "auth"
