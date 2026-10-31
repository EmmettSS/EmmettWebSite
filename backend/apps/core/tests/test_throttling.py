from __future__ import annotations

import pytest
from django.core.cache import cache
from django.test import RequestFactory
from rest_framework.request import Request
from rest_framework.test import APIClient
from rest_framework.throttling import (
    AnonRateThrottle,
    ScopedRateThrottle,
    UserRateThrottle,
)

from apps.core.throttling import (
    AIEngineRateThrottle,
    AuthRateThrottle,
    ContactFormRateThrottle,
    NewsletterRateThrottle,
    ProxyAwareAnonRateThrottle,
    ProxyAwareUserRateThrottle,
)
from apps.core.utils.request import get_client_ip

pytestmark = pytest.mark.django_db


class TestThrottleScopes:
    def test_default_proxy_aware_subclasses(self) -> None:
        assert issubclass(ProxyAwareAnonRateThrottle, AnonRateThrottle)
        assert issubclass(ProxyAwareUserRateThrottle, UserRateThrottle)

    def test_contact_form_scope(self) -> None:
        assert ContactFormRateThrottle.scope == "contact_form"
        assert issubclass(ContactFormRateThrottle, ScopedRateThrottle)

    def test_ai_engine_scope(self) -> None:
        assert AIEngineRateThrottle.scope == "ai_engine"
        assert issubclass(AIEngineRateThrottle, ScopedRateThrottle)

    def test_auth_scope(self) -> None:
        assert AuthRateThrottle.scope == "auth"
        assert issubclass(AuthRateThrottle, ScopedRateThrottle)

    def test_newsletter_scope(self) -> None:
        assert NewsletterRateThrottle.scope == "newsletter"
        assert issubclass(NewsletterRateThrottle, ScopedRateThrottle)

    def test_all_throttle_classes_sync_ident_with_get_client_ip(self) -> None:
        raw = RequestFactory().get(
            "/api/v1/services/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="198.51.100.50, 203.0.113.44",
        )
        drf_req = Request(raw)
        expected = get_client_ip(raw)
        assert expected == "203.0.113.44"
        for throttle_cls in (
            ProxyAwareAnonRateThrottle,
            ProxyAwareUserRateThrottle,
            ContactFormRateThrottle,
            AIEngineRateThrottle,
            AuthRateThrottle,
            NewsletterRateThrottle,
        ):
            assert throttle_cls().get_ident(drf_req) == expected

        no_ip = RequestFactory().get("/api/v1/services/")
        del no_ip.META["REMOTE_ADDR"]
        assert ProxyAwareAnonRateThrottle().get_ident(Request(no_ip)) == ""


class TestNewsletterThrottleEnforced:
    """ADR-0006: عضویت خبرنامه باید به ۳ درخواست/روز به ازای هر IP واقعی محدود شود."""

    def setup_method(self) -> None:
        cache.clear()

    def test_fourth_request_in_same_day_is_throttled(self) -> None:
        client = APIClient()
        for index in range(3):
            response = client.post(
                "/api/v1/leads/newsletter/",
                {"email": f"sub{index}@example.com"},
            )
            assert response.status_code == 201

        fourth = client.post("/api/v1/leads/newsletter/", {"email": "sub4@example.com"})
        assert fourth.status_code == 429

    def test_distinct_real_ips_behind_loopback_proxy_have_isolated_quotas(self) -> None:
        client = APIClient()
        for index in range(3):
            res_a = client.post(
                "/api/v1/leads/newsletter/",
                {"email": f"usera-{index}@example.com"},
                REMOTE_ADDR="127.0.0.1",
                HTTP_X_FORWARDED_FOR="203.0.113.11",
            )
            assert res_a.status_code == 201

        # کاربر اول به سقف ۳ درخواست رسید:
        blocked_a = client.post(
            "/api/v1/leads/newsletter/",
            {"email": "usera-blocked@example.com"},
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="203.0.113.11",
        )
        assert blocked_a.status_code == 429

        # کاربر دوم پشت همان پراکسی 127.0.0.1 سهمیهٔ مستقل خودش را دارد و قفل نمی‌شود:
        allowed_b = client.post(
            "/api/v1/leads/newsletter/",
            {"email": "userb-ok@example.com"},
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="203.0.113.22",
        )
        assert allowed_b.status_code == 201

    def test_spoofed_xff_prefix_cannot_bypass_throttle(self) -> None:
        client = APIClient()
        for index in range(3):
            res = client.post(
                "/api/v1/leads/newsletter/",
                {"email": f"attacker-{index}@example.com"},
                REMOTE_ADDR="127.0.0.1",
                HTTP_X_FORWARDED_FOR=f"198.51.100.{index}, 203.0.113.77",
            )
            assert res.status_code == 201

        blocked = client.post(
            "/api/v1/leads/newsletter/",
            {"email": "attacker-4@example.com"},
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="198.51.100.99, 203.0.113.77",
        )
        assert blocked.status_code == 429
