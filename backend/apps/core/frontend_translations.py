"""Read-only public API for approved, database-managed frontend copy."""

from __future__ import annotations

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Translation


class FrontendCopyTranslationsView(APIView):
    """Return the public frontend translation namespace for one supported locale.

    Only ``site.copy`` rows explicitly stored as plain text are returned. Other
    Translation namespaces may be used internally and ``is_html`` entries are
    deliberately excluded so this endpoint never turns admin-entered HTML into
    client-side markup.
    """

    permission_classes = [AllowAny]
    authentication_classes: list[type] = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="locale",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=[code for code, _label in settings.LANGUAGES],
                description="Requested site locale.",
            )
        ],
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
        description="Read-only localized frontend copy managed in Django Admin.",
    )
    def get(self, request: Request) -> Response:
        locale = request.query_params.get("locale", "")
        supported_locales = {code for code, _label in settings.LANGUAGES}
        if locale not in supported_locales:
            return Response(
                {"detail": "A supported locale query parameter is required."},
                status=400,
            )

        messages = dict(
            Translation.objects.filter(
                namespace="site.copy",
                locale=locale,
                is_html=False,
            )
            .exclude(value="")
            .order_by("key")
            .values_list("key", "value")
        )
        return Response({"locale": locale, "messages": messages})
