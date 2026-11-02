from __future__ import annotations

from django.db.models import Prefetch, QuerySet
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.catalog.serializers import CatalogSerializer
from apps.ai_engine.models import Catalog, CatalogOption


class CatalogListView(APIView):
    """Return active public catalog choices only; labels are localized by Accept-Language."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="keys",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Comma-separated catalog keys; omit to return all public catalogs.",
            )
        ],
        responses={200: CatalogSerializer(many=True)},
        tags=["AI catalogs"],
    )
    def get(self, request: Request) -> Response:
        raw_keys = request.query_params.get("keys", "")
        keys = [key.strip() for key in raw_keys.split(",") if key.strip()]
        if len(keys) > 16 or any(not key.replace("_", "").isalnum() for key in keys):
            return Response({"detail": "Catalog filters are invalid."}, status=status.HTTP_400_BAD_REQUEST)

        options: QuerySet[CatalogOption] = CatalogOption.objects.filter(
            is_active=True,
            is_public=True,
            deleted_at__isnull=True,
        ).order_by("order", "key")
        catalogs = Catalog.objects.filter(
            is_active=True,
            is_public=True,
            deleted_at__isnull=True,
        ).prefetch_related(Prefetch("options", queryset=options))
        if keys:
            catalogs = catalogs.filter(key__in=keys)
        catalogs = catalogs.order_by("order", "key")
        return Response(CatalogSerializer(catalogs, many=True, context={"request": request}).data)
