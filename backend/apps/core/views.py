"""Viewهای عمومی زیرساختی (مثل health-check) که به هیچ دامنهٔ محتوایی خاصی تعلق ندارند."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django.utils.translation import get_language
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.logging import get_logger
from apps.core.search import search as run_search

logger = get_logger(__name__)


class HealthCheckView(APIView):
    """بررسی سلامت پایهٔ سرویس: اتصال دیتابیس و cache.

    برای مانیتورینگ خارجی (uptime monitor) و بررسی سریع بعد از دیپلوی استفاده
    می‌شود. عمداً هیچ اطلاعات حساسی (نسخهٔ دقیق پکیج‌ها و...) افشا نمی‌کند.
    """

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        responses={
            200: OpenApiTypes.OBJECT,
            503: OpenApiTypes.OBJECT,
        },
        description="بررسی سلامت دیتابیس و cache؛ بدون نیاز به احراز هویت.",
    )
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


class GlobalSearchView(APIView):
    """جست‌وجوی سراسری — آیتم ۸ بریف (ADR-0021: MySQL FULLTEXT prod / SQLite FTS5 dev)."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, description="عبارت جست‌وجو"),
            OpenApiParameter("locale", OpenApiTypes.STR, description="fa یا en؛ پیش‌فرض بر اساس زبان درخواست"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="حداکثر تعداد نتیجه (سقف ۵۰)"),
        ],
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "")
        locale = request.query_params.get("locale") or get_language() or "fa"
        limit = min(int(request.query_params.get("limit", 20) or 20), 50)
        results = run_search(query=query, locale=locale, limit=limit)
        return Response(
            {
                "query": query,
                "locale": locale,
                "count": len(results),
                "results": [
                    {**asdict(r), "public_id": str(r.public_id)} for r in results
                ],
            }
        )
