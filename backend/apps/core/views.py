"""Viewهای عمومی زیرساختی (مثل health-check) که به هیچ دامنهٔ محتوایی خاصی تعلق ندارند."""

from __future__ import annotations

from typing import Any

from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.logging import get_logger

logger = get_logger(__name__)


class HealthCheckView(APIView):
    """بررسی سلامت پایهٔ سرویس: اتصال دیتابیس و cache.

    برای مانیتورینگ خارجی (uptime monitor) و بررسی سریع بعد از دیپلوی استفاده
    می‌شود. عمداً هیچ اطلاعات حساسی (نسخهٔ دقیق پکیج‌ها و...) افشا نمی‌کند.
    """

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    def get(self, request: Request) -> Response:
        checks: dict[str, Any] = {"database": self._check_database(), "cache": self._check_cache()}
        healthy = all(checks.values())

        if not healthy:
            logger.warning("health_check_degraded", checks=checks)

        return Response(
            {
                "status": "ok" if healthy else "degraded",
                "checks": checks,
                "server_time": timezone.now().isoformat(),
            },
            status=200 if healthy else 503,
        )

    @staticmethod
    def _check_database() -> bool:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except Exception:  # noqa: BLE001 - هر خطای دیتابیس یعنی ناسالم
            logger.exception("health_check_database_failed")
            return False

    @staticmethod
    def _check_cache() -> bool:
        try:
            cache.set("health_check_probe", "ok", timeout=5)
            return bool(cache.get("health_check_probe") == "ok")
        except Exception:  # noqa: BLE001
            logger.exception("health_check_cache_failed")
            return False
