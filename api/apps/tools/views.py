import secrets

from django.core.cache import cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import jalali as jalali_core
from .holidays import serialize_calendar
from .models import HolidayCalendar, SharedResult, ToolUsage
from .normalize import RULES_VERSION, normalize_persian
from .serializers import (
    HolidayCalendarResponseSerializer,
    JalaliConvertResponseSerializer,
    NormalizeRequestSerializer,
    NormalizeResponseSerializer,
    ShareCreateSerializer,
    ShareDetailSerializer,
    ShareResponseSerializer,
    ToolUsageResponseSerializer,
    ToolUsageSerializer,
)

HOLIDAY_CACHE_SECONDS = 60 * 60 * 24


class ToolWriteThrottle(AnonRateThrottle):
    rate = "30/hour"


def _bad_request(message_fa: str, message_en: str) -> Response:
    return Response(
        {"message_fa": message_fa, "message_en": message_en},
        status=status.HTTP_400_BAD_REQUEST,
    )


class HolidayCalendarView(APIView):
    """Versioned holiday source. Cached in LocMem; the DB row is the source of truth."""

    serializer_class = HolidayCalendarResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(parameters=[OpenApiParameter("year", OpenApiTypes.INT, required=True)])
    def get(self, request):
        raw_year = request.query_params.get("year")
        if raw_year is None or not raw_year.isdigit():
            return _bad_request("پارامتر سال لازم است.", "The year parameter is required.")
        year = int(raw_year)
        if year < jalali_core.MIN_JALALI_YEAR or year > jalali_core.MAX_JALALI_YEAR:
            return _bad_request(
                f"سال باید بین {jalali_core.MIN_JALALI_YEAR} و {jalali_core.MAX_JALALI_YEAR} باشد.",
                f"Year must be between {jalali_core.MIN_JALALI_YEAR} and {jalali_core.MAX_JALALI_YEAR}.",
            )
        cache_key = f"tools:holidays:{year}"
        payload = cache.get(cache_key)
        if payload is None:
            calendar = (
                HolidayCalendar.objects.filter(year=year)
                .prefetch_related("items")
                .first()
            )
            if calendar is None:
                payload = {
                    "year": year,
                    "version": "unavailable",
                    "source": "",
                    "coverage": "unknown-year",
                    "note_fa": "برای این سال دادهٔ تأییدشده‌ای ثبت نشده است؛ محاسبه فقط جمعه‌ها را کنار می‌گذارد.",
                    "note_en": "No verified data for this year; only Fridays are skipped.",
                    "items": [],
                }
            else:
                payload = serialize_calendar(calendar)
            cache.set(cache_key, payload, HOLIDAY_CACHE_SECONDS)
        return Response(payload)


class JalaliConvertView(APIView):
    serializer_class = JalaliConvertResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        parameters=[
            OpenApiParameter("from", OpenApiTypes.STR, required=True, enum=["jalali", "gregorian"]),
            OpenApiParameter("to", OpenApiTypes.STR, required=True, enum=["jalali", "gregorian"]),
            OpenApiParameter("value", OpenApiTypes.STR, required=True),
        ]
    )
    def get(self, request):
        source = request.query_params.get("from")
        target = request.query_params.get("to")
        value = request.query_params.get("value", "")
        if source not in {"jalali", "gregorian"} or target not in {"jalali", "gregorian"} or source == target:
            return _bad_request(
                "پارامترهای from و to باید یکی شمسی و دیگری میلادی باشد.",
                "from and to must be one jalali and one gregorian.",
            )
        try:
            if source == "jalali":
                parsed = jalali_core.parse_jalali(value)
                if parsed is None:
                    return _bad_request("تاریخ شمسی نامعتبر است.", "Invalid Jalali date.")
                g_year, g_month, g_day = jalali_core.jalali_to_gregorian(*parsed)
                j_year, j_month, j_day = parsed
            else:
                parsed = jalali_core.parse_gregorian(value)
                if parsed is None:
                    return _bad_request("تاریخ میلادی نامعتبر است.", "Invalid Gregorian date.")
                j_year, j_month, j_day = jalali_core.gregorian_to_jalali(*parsed)
                g_year, g_month, g_day = parsed
        except (jalali_core.OutOfRange, ValueError):
            return _bad_request(
                f"تاریخ خارج از بازهٔ پشتیبانی‌شده ({jalali_core.MIN_JALALI_YEAR}–{jalali_core.MAX_JALALI_YEAR}) است.",
                f"Date is outside the supported range ({jalali_core.MIN_JALALI_YEAR}–{jalali_core.MAX_JALALI_YEAR}).",
            )
        weekday = jalali_core.jalali_weekday(j_year, j_month, j_day)
        day_of_year = sum(jalali_core.month_length(j_year, month) for month in range(1, j_month)) + j_day
        return Response(
            {
                "jalali": jalali_core.format_numeric(j_year, j_month, j_day),
                "gregorian": f"{g_year:04d}-{g_month:02d}-{g_day:02d}",
                "weekday_fa": jalali_core.WEEKDAYS_FA[weekday],
                "weekday_en": jalali_core.WEEKDAYS_EN[weekday],
                "day_of_year": day_of_year,
                "leap_year": jalali_core.is_leap_year(j_year),
            }
        )


class PersianTextNormalizeView(APIView):
    serializer_class = NormalizeRequestSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ToolWriteThrottle]

    @extend_schema(request=NormalizeRequestSerializer, responses=NormalizeResponseSerializer)
    def post(self, request):
        serializer = NormalizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = normalize_persian(data["text"], data.get("rules"))
        return Response(result)


class ShareCreateView(APIView):
    serializer_class = ShareCreateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ToolWriteThrottle]

    @extend_schema(request=ShareCreateSerializer, responses=ShareResponseSerializer)
    def post(self, request):
        serializer = ShareCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        share_id = secrets.token_urlsafe(12)
        SharedResult.objects.create(
            tool=data["tool"],
            payload={
                "locale": data["locale"],
                "summary_fa": data["summary_fa"],
                "summary_en": data["summary_en"],
                "params": data.get("params", {}),
            },
            share_id=share_id,
            expires_at=None,  # permanent by design; the page is noindex
        )
        locale = data["locale"]
        return Response(
            {
                "share_id": share_id,
                "path": f"/{locale}/share/{share_id}/",
                "permanent": True,
                "noindex": True,
            },
            status=status.HTTP_201_CREATED,
        )


class ShareDetailView(APIView):
    serializer_class = ShareDetailSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, share_id: str):
        shared = SharedResult.objects.filter(share_id=share_id).first()
        if shared is None:
            return _bad_request("این لینک اشتراک پیدا نشد.", "That share link was not found.")
        payload = shared.payload or {}
        return Response(
            {
                "share_id": shared.share_id,
                "tool": shared.tool,
                "locale": payload.get("locale", "fa"),
                "summary_fa": payload.get("summary_fa", ""),
                "summary_en": payload.get("summary_en", ""),
                "params": payload.get("params", {}),
                "created_at": shared.created_at,
            }
        )


class ToolUsageView(APIView):
    """Aggregate ping only: tool id, locale, completion flag. No input data, no IP."""

    serializer_class = ToolUsageSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ToolWriteThrottle]

    @extend_schema(request=ToolUsageSerializer, responses=ToolUsageResponseSerializer)
    def post(self, request):
        serializer = ToolUsageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ToolUsage.objects.create(
            tool=data["tool"], locale=data["locale"], completed=data["completed"]
        )
        return Response({"accepted": True, "stored": True}, status=status.HTTP_202_ACCEPTED)


__all__ = [
    "HolidayCalendarView",
    "JalaliConvertView",
    "PersianTextNormalizeView",
    "ShareCreateView",
    "ShareDetailView",
    "ToolUsageView",
    "RULES_VERSION",
]
