from __future__ import annotations

import pytest
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.core.throttling import (
    AIEngineRateThrottle,
    AuthRateThrottle,
    ContactFormRateThrottle,
    NewsletterRateThrottle,
)

pytestmark = pytest.mark.django_db


class TestThrottleScopes:
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


class TestNewsletterThrottleEnforced:
    """ADR-0006: عضویت خبرنامه باید به ۳ درخواست/روز/IP محدود شود."""

    def test_fourth_request_in_same_day_is_throttled(self, settings: object) -> None:
        client = APIClient()
        for index in range(3):
            response = client.post("/api/v1/leads/newsletter/", {"email": f"sub{index}@example.com"})
            assert response.status_code == 201

        fourth = client.post("/api/v1/leads/newsletter/", {"email": "sub4@example.com"})
        assert fourth.status_code == 429
