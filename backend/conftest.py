"""تنظیمات مشترک pytest برای کل backend.

``CACHES["default"]`` بین تست‌ها به‌صورت پیش‌فرض پاک نمی‌شود (نه
``LocMemCache`` و نه ``FileBasedCache``)؛ بدون این fixture، تست‌هایی که به
Throttle (مثل ``AuthRateThrottle`` با نرخ پیش‌فرض ۱۰ در ساعت روی
``/api/v1/auth/login/`` و ``/register/``) وابسته‌اند می‌توانند به‌خاطر
فراخوانی‌های تست‌های دیگر در همان session با ۴۲۹ غیرمنتظره مواجه شوند.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache() -> Iterator[None]:
    cache.clear()
    yield
    cache.clear()
