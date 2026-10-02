import time
from datetime import timedelta

from django.db import connection
from django.db.models import Count, Q
from django.utils import timezone

from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.assistant.models import AssistantUsage
from apps.jobs.models import Job
from apps.tools.catalog import localized_items
from apps.tools.serializers import ToolCatalogResponseSerializer

_started_at = time.monotonic()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    version = serializers.CharField()
    db = serializers.CharField()
    uptime = serializers.IntegerField()


class PublicToolsView(APIView):
    serializer_class = ToolCatalogResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        lang = "en" if request.query_params.get("lang") == "en" else "fa"
        items = localized_items(lang)
        return Response({"items": items, "count": len(items)})


class HealthView(APIView):
    serializer_class = HealthSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            db = "ok"
        except Exception:
            db = "error"
        return Response(
            {
                "status": "ok" if db == "ok" else "degraded",
                "version": "1.0.0",
                "uptime": int(time.monotonic() - _started_at),
                "db": db,
            }
        )


health = HealthView.as_view()


class OpsErrorSerializer(serializers.Serializer):
    window_hours = serializers.IntegerField()
    jobs_pending = serializers.IntegerField()
    jobs_running = serializers.IntegerField()
    jobs_failed_window = serializers.IntegerField()
    jobs_failed_total = serializers.IntegerField()
    jobs_stuck = serializers.IntegerField()
    oldest_pending_minutes = serializers.IntegerField(allow_null=True)
    failures_by_kind = serializers.DictField(child=serializers.IntegerField())
    assistant_cost_today_usd = serializers.FloatField()


class OpsErrorsView(APIView):
    """Admin-only error counter for the runbook (Phase 5 §6).

    It answers the three questions the daily check asks: is the queue moving, what is failing,
    and what has the assistant cost today. No visitor data is exposed — only counts.
    """

    serializer_class = OpsErrorSerializer
    permission_classes = [IsAdminUser]

    def get(self, request):
        window_hours = max(1, min(int(request.query_params.get("hours", 24)), 24 * 30))
        since = timezone.now() - timedelta(hours=window_hours)
        jobs = Job.objects.all()
        pending = jobs.filter(state=Job.State.PENDING)
        stuck_cutoff = timezone.now() - timedelta(minutes=15)
        oldest = pending.order_by("created_at").values_list("created_at", flat=True).first()
        usage = AssistantUsage.today()
        return Response(
            {
                "window_hours": window_hours,
                "jobs_pending": pending.count(),
                "jobs_running": jobs.filter(state=Job.State.RUNNING).count(),
                "jobs_failed_window": jobs.filter(
                    state=Job.State.FAILED, finished_at__gte=since
                ).count(),
                "jobs_failed_total": jobs.filter(state=Job.State.FAILED).count(),
                "jobs_stuck": pending.filter(created_at__lt=stuck_cutoff).count(),
                "oldest_pending_minutes": int((timezone.now() - oldest).total_seconds() // 60)
                if oldest
                else None,
                "failures_by_kind": dict(
                    jobs.filter(state=Job.State.FAILED, finished_at__gte=since)
                    .values_list("kind")
                    .annotate(total=Count("id", filter=Q(state=Job.State.FAILED)))
                ),
                "assistant_cost_today_usd": float(usage.cost_usd if usage else 0.0),
            }
        )


ops_errors = OpsErrorsView.as_view()
