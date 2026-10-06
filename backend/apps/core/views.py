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
from apps.core.seo import (
    SITEMAP_SECTIONS,
    build_faq_payload,
    build_seo_settings_payload,
    build_sitemap_entries,
)
from apps.core.seo_serializers import (
    FAQItemSerializer,
    RedirectEntrySerializer,
    SEOSettingsSerializer,
    SitemapEntrySerializer,
)

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
            OpenApiParameter(
                "locale",
                OpenApiTypes.STR,
                description="fa یا en؛ پیش‌فرض بر اساس زبان درخواست",
            ),
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
                "results": [{**asdict(r), "public_id": str(r.public_id)} for r in results],
            }
        )


class SEOSettingsView(APIView):
    """تنظیمات SEO سایت (پیش‌فرض‌های متا، سازمان، تأیید Search Console).

    مصرف‌کننده: ``frontend/src/lib/seo`` برای ``metadataBase``، متاتگ
    ``google-site-verification`` و JSON-LD نوع ``Organization``/``WebSite``.
    """

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        responses={200: SEOSettingsSerializer},
        description="تنظیمات SEO قابل‌ویرایش از ادمین (کش‌شده).",
        tags=["seo"],
    )
    def get(self, request: Request) -> Response:
        return Response(build_seo_settings_payload())


class SEOSitemapView(APIView):
    """فهرست URLهای عمومی برای ساخت ``sitemap.xml`` در فرانت‌اند.

    چرا endpoint و نه ``django.contrib.sitemaps``؟ چون HTML عمومی توسط
    Next.js سرو می‌شود و sitemap هم باید از همان دامنه و همان مسیرهای
    بومی‌سازی‌شده بیاید (ADR-0031). این endpoint فقط دادهٔ خام و کش‌شده
    می‌دهد و بخش‌بندی (``section``) را برای sitemap index برمی‌گرداند.
    """

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        responses={200: SitemapEntrySerializer(many=True)},
        description="URLهای عمومی منتشرشده + صفحه‌های ثابت، با lastmod/changefreq/priority.",
        tags=["seo"],
    )
    def get(self, request: Request) -> Response:
        return Response({"results": build_sitemap_entries(), "sections": list(SITEMAP_SECTIONS)})


class SEORedirectsView(APIView):
    """نگاشت ریدایرکت‌های فعال (۳۰۱/۳۰۲/۴۱۰) برای middleware فرانت‌اند."""

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        responses={200: RedirectEntrySerializer(many=True)},
        description="ریدایرکت‌های فعال مدیریت‌شده از ادمین (کش‌شده در بک‌اند و فرانت).",
        tags=["seo"],
    )
    def get(self, request: Request) -> Response:
        from apps.core.models import Redirect

        rows = (
            Redirect.objects.filter(is_active=True)
            .only("from_path", "target", "status_code", "updated_at")
            .order_by("from_path")
        )
        return Response({"results": [RedirectEntrySerializer(row).data for row in rows]})


class SEOFAQView(APIView):
    """پرسش‌های متداول یک مسیر (برای بخش FAQ و JSON-LD نوع ``FAQPage``)."""

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="path",
                type=OpenApiTypes.STR,
                required=True,
                description="مسیر صفحه؛ مثال: /services/web-development",
            )
        ],
        responses={200: FAQItemSerializer(many=True)},
        description="پرسش‌های متداول فعال همان مسیر در زبان درخواست (Accept-Language).",
        tags=["seo"],
    )
    def get(self, request: Request) -> Response:
        path = str(request.query_params.get("path", "") or "").strip()
        if not path:
            return Response({"detail": "پارامتر path الزامی است."}, status=400)
        return Response({"results": build_faq_payload(path, locale=get_language())})
