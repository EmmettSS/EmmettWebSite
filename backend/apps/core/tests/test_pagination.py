from __future__ import annotations

import pytest
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.test import APIRequestFactory

from apps.core.models import AuditLog, log_action

pytestmark = pytest.mark.django_db


class _AuditLogSerializer(serializers.ModelSerializer[AuditLog]):
    class Meta:
        model = AuditLog
        fields = ["id", "action"]


class _AuditLogListView(ListAPIView[AuditLog]):
    """Viewی موقت فقط برای تست یکپارچهٔ StandardResultsSetPagination."""

    queryset = AuditLog.objects.all()
    serializer_class = _AuditLogSerializer
    permission_classes = [AllowAny]
    authentication_classes: list[type] = []


class TestStandardResultsSetPagination:
    def test_paginated_response_envelope(self) -> None:
        for i in range(25):
            log_action(action=f"event.{i}")

        factory = APIRequestFactory()
        request = factory.get("/fake-url/")
        response = _AuditLogListView.as_view()(request)

        assert response.status_code == 200
        assert response.data["count"] == 25
        assert response.data["total_pages"] == 2
        assert response.data["current_page"] == 1
        assert len(response.data["results"]) == 20
        assert response.data["next"] is not None
        assert response.data["previous"] is None

    def test_page_size_query_param_overrides_default(self) -> None:
        for i in range(10):
            log_action(action=f"event.{i}")

        factory = APIRequestFactory()
        request = factory.get("/fake-url/", {"page_size": 5})
        response = _AuditLogListView.as_view()(request)

        assert len(response.data["results"]) == 5
        assert response.data["total_pages"] == 2
