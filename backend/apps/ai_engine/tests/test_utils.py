from __future__ import annotations

import hashlib
import hmac
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.middleware import SessionMiddleware
from django.http import HttpRequest, HttpResponse
from django.test import RequestFactory
from rest_framework.request import Request

from apps.ai_engine.utils import requester_pseudonym


def _empty_response(request: HttpRequest) -> HttpResponse:
    return HttpResponse()


def test_requester_pseudonym_fallback_never_uses_client_ip() -> None:
    raw_request = RequestFactory().post(
        "/api/v1/ai/advisor/",
        HTTP_X_FORWARDED_FOR="203.0.113.42",
        HTTP_USER_AGENT="private-agent-string",
    )
    SessionMiddleware(_empty_response).process_request(raw_request)
    request = Request(raw_request, authenticators=[])
    request.user = AnonymousUser()
    expected_source = "anonymous:ephemeral-sessionless-value"

    with (
        patch.object(raw_request.session, "create", side_effect=RuntimeError("session store unavailable")),
        patch("apps.ai_engine.utils.secrets.token_urlsafe", return_value="ephemeral-sessionless-value"),
    ):
        pseudonym = requester_pseudonym(request)

    expected = hmac.new(
        settings.SECRET_KEY.encode("utf-8"), expected_source.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    ip_derived = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        b"anonymous:203.0.113.42",
        hashlib.sha256,
    ).hexdigest()
    assert pseudonym == expected
    assert pseudonym != ip_derived
    assert "203.0.113.42" not in pseudonym
    assert "private-agent-string" not in pseudonym
