from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.db import connection

        try:
            connection.ensure_connection()
            db = "ok"
        except Exception:
            db = "error"
        return Response(
            {"status": "ok" if db == "ok" else "degraded", "version": "1.0.0", "db": db}
        )
