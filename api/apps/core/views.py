import time
from django.db import connection

from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
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
