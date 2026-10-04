from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.core.views import HealthCheckView

pytestmark = pytest.mark.django_db


class TestHealthCheckEndpoint:
    def test_health_check_returns_ok(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/health/")

        assert response.status_code == 200
        assert response.data["status"] == "ok"
        assert response.data["checks"] == {"database": True, "cache": True}

    def test_health_check_is_public_no_auth_required(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/health/")
        assert response.status_code != 401
        assert response.status_code != 403

    def test_health_check_returns_503_when_database_is_down(self) -> None:
        client = APIClient()
        with patch.object(HealthCheckView, "_check_database", return_value=False):
            response = client.get("/api/v1/health/")

        assert response.status_code == 503
        assert response.data["status"] == "degraded"
        assert response.data["checks"]["database"] is False

    def test_health_check_returns_503_when_cache_is_down(self) -> None:
        client = APIClient()
        with patch.object(HealthCheckView, "_check_cache", return_value=False):
            response = client.get("/api/v1/health/")

        assert response.status_code == 503
        assert response.data["checks"]["cache"] is False

    def test_check_database_returns_false_on_exception(self) -> None:
        with patch("apps.core.views.connection") as mock_connection:
            mock_connection.cursor.side_effect = Exception("boom")
            assert HealthCheckView._check_database() is False

    def test_check_cache_returns_false_on_exception(self) -> None:
        with patch("apps.core.views.cache") as mock_cache:
            mock_cache.set.side_effect = Exception("boom")
            assert HealthCheckView._check_cache() is False
