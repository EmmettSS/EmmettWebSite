from __future__ import annotations

from typing import Any

from django.test import RequestFactory

from apps.core.utils.request import get_client_ip


class TestGetClientIp:
    def test_uses_remote_addr_by_default(self) -> None:
        request = RequestFactory().get("/", REMOTE_ADDR="203.0.113.5")
        assert get_client_ip(request) == "203.0.113.5"

    def test_single_trusted_proxy_reads_rightmost_and_defeats_spoofing(self, settings: Any) -> None:
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
        # حالت ۱: Apache هدر را با RequestHeader set تک‌مقدار ست کرده است.
        single = RequestFactory().get("/", REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR="203.0.113.5")
        assert get_client_ip(single) == "203.0.113.5"

        # حالت ۲: مهاجم پیشوند جعلی فرستاده و Apache در انتهای زنجیره IP واقعی را append کرده است.
        spoofed = RequestFactory().get(
            "/", REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR="198.51.100.99, 203.0.113.5"
        )
        assert get_client_ip(spoofed) == "203.0.113.5"

    def test_two_trusted_proxies_reads_second_from_right_and_defeats_spoofing(self, settings: Any) -> None:
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 2}
        two_hops = RequestFactory().get(
            "/", REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR="203.0.113.5, 10.0.0.1"
        )
        assert get_client_ip(two_hops) == "203.0.113.5"

        spoofed_two_hops = RequestFactory().get(
            "/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="198.51.100.99, 203.0.113.5, 10.0.0.1",
        )
        assert get_client_ip(spoofed_two_hops) == "203.0.113.5"

    def test_zero_trusted_proxies_ignores_forwarded_headers(self, settings: Any) -> None:
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 0}
        request = RequestFactory().get(
            "/",
            REMOTE_ADDR="203.0.113.5",
            HTTP_X_FORWARDED_FOR="198.51.100.99",
            HTTP_X_REAL_IP="198.51.100.88",
        )
        assert get_client_ip(request) == "203.0.113.5"

    def test_falls_back_to_x_real_ip_then_remote_addr_on_empty_xff(self, settings: Any) -> None:
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
        via_real_ip = RequestFactory().get(
            "/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR=" ,  ",
            HTTP_X_REAL_IP="203.0.113.8",
        )
        assert get_client_ip(via_real_ip) == "203.0.113.8"

        fallback_remote = RequestFactory().get("/", REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR=" ,  ")
        assert get_client_ip(fallback_remote) == "127.0.0.1"

    def test_when_num_proxies_unset_uses_rightmost_non_empty(self, settings: Any) -> None:
        rf = dict(settings.REST_FRAMEWORK)
        rf.pop("NUM_PROXIES", None)
        settings.REST_FRAMEWORK = rf
        request = RequestFactory().get(
            "/", REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR="198.51.100.99, 203.0.113.5"
        )
        assert get_client_ip(request) == "203.0.113.5"

    def test_returns_none_when_nothing_available(self) -> None:
        request = RequestFactory().get("/")
        del request.META["REMOTE_ADDR"]
        assert get_client_ip(request) is None
