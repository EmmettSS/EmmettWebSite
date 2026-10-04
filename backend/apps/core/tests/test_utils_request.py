from __future__ import annotations

from django.test import RequestFactory

from apps.core.utils.request import get_client_ip


class TestGetClientIp:
    def test_uses_remote_addr_by_default(self) -> None:
        request = RequestFactory().get("/", REMOTE_ADDR="203.0.113.5")
        assert get_client_ip(request) == "203.0.113.5"

    def test_prefers_x_forwarded_for_first_entry(self) -> None:
        request = RequestFactory().get(
            "/", REMOTE_ADDR="10.0.0.1", HTTP_X_FORWARDED_FOR="203.0.113.5, 10.0.0.1"
        )
        assert get_client_ip(request) == "203.0.113.5"

    def test_returns_none_when_nothing_available(self) -> None:
        request = RequestFactory().get("/")
        del request.META["REMOTE_ADDR"]
        assert get_client_ip(request) is None
