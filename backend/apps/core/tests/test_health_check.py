from __future__ import annotations

from typing import cast
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
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


class TestProxyDiagnosticEndpoint:
    def test_anonymous_and_non_staff_users_are_denied(self) -> None:
        anon_client = APIClient()
        assert anon_client.get("/api/v1/health/proxy/").status_code in (401, 403)

        regular_user = cast(User, UserFactory(is_staff=False))
        user_client = APIClient()
        user_client.force_authenticate(user=regular_user)
        assert user_client.get("/api/v1/health/proxy/").status_code == 403

    def test_staff_detects_missing_xff_loopback_hazard(self) -> None:
        staff_user = cast(User, UserFactory(is_staff=True))
        client = APIClient()
        client.force_authenticate(user=staff_user)

        res = client.get("/api/v1/health/proxy/", REMOTE_ADDR="127.0.0.1")
        assert res.status_code == 200
        assert res.data["resolved_client_ip"] == "127.0.0.1"
        assert res.data["drf_throttle_ident"] == "127.0.0.1"
        assert res.data["verdict"] == {
            "xff_present": False,
            "chain_length": 0,
            "proxy_behavior": "missing",
            "ident_is_loopback_or_empty": True,
            "subsystems_in_sync": True,
            "ready_for_traffic": False,
        }

    def test_staff_verifies_single_hop_and_multi_hop_chains(self) -> None:
        staff_user = cast(User, UserFactory(is_staff=True))
        client = APIClient()
        client.force_authenticate(user=staff_user)

        single = client.get(
            "/api/v1/health/proxy/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="203.0.113.55",
            HTTP_X_REAL_IP="203.0.113.55",
            HTTP_X_FORWARDED_PROTO="https",
        )
        assert single.status_code == 200
        assert single.data["resolved_client_ip"] == "203.0.113.55"
        assert single.data["drf_throttle_ident"] == "203.0.113.55"
        assert single.data["verdict"] == {
            "xff_present": True,
            "chain_length": 1,
            "proxy_behavior": "overwrite_or_single_hop",
            "ident_is_loopback_or_empty": False,
            "subsystems_in_sync": True,
            "ready_for_traffic": True,
        }

        multi = client.get(
            "/api/v1/health/proxy/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="198.51.100.99, 203.0.113.55",
        )
        assert multi.status_code == 200
        assert multi.data["resolved_client_ip"] == "203.0.113.55"
        assert multi.data["verdict"]["proxy_behavior"] == "multi_hop_chain"
        assert multi.data["verdict"]["chain_length"] == 2
        assert multi.data["verdict"]["ready_for_traffic"] is True
