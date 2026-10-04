from __future__ import annotations

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestCustomExceptionHandler:
    def test_method_not_allowed_uses_standard_error_envelope(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/health/", data={})

        assert response.status_code == 405
        assert "error" in response.data
        assert response.data["error"]["code"] == "method_not_allowed"
        assert "message" in response.data["error"]

    def test_not_found_route_returns_404(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/this-route-does-not-exist/")
        assert response.status_code == 404
