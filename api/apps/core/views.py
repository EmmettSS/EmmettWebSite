import time
from django.db import connection

from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import ToolCatalogResponseSerializer

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
        # The catalog is intentionally empty until Phase 2 ships verified tools.
        return Response({"items": [], "count": 0})


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
