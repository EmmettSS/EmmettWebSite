from __future__ import annotations

from rest_framework.throttling import ScopedRateThrottle

from apps.core.throttling import AIEngineRateThrottle, AuthRateThrottle, ContactFormRateThrottle


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
