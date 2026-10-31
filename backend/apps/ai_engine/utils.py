"""Locale and privacy-safe request helpers shared by AI endpoints."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from django.conf import settings
from django.http import HttpRequest
from rest_framework.request import Request


def resolve_locale(request: Request | HttpRequest | None) -> str:
    if request is None:
        return "fa"
    meta = request.META
    language = meta.get("HTTP_ACCEPT_LANGUAGE", "")
    preferred = language.split(",", maxsplit=1)[0].split("-", maxsplit=1)[0].lower()
    return "en" if preferred == "en" else "fa"


def requester_pseudonym(request: Request) -> str:
    """HMAC the authenticated id/session; never persist IP or user-agent data."""
    django_request = request._request
    user = request.user
    if user.is_authenticated:
        source = f"user:{user.pk}"
    else:
        session_key = django_request.session.session_key
        if not session_key:
            try:
                django_request.session.create()
                session_key = django_request.session.session_key
            except Exception:
                # A broken session store must not force IP-based pseudonymization or
                # prevent an otherwise valid public AI request from being processed.
                session_key = None
        source = f"session:{session_key}" if session_key else f"anonymous:{secrets.token_urlsafe(32)}"
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), source.encode("utf-8"), hashlib.sha256).hexdigest()


def safe_error_code(exc: BaseException) -> str:
    """Map arbitrary exceptions to a low-cardinality code without persisting exception text."""
    name = exc.__class__.__name__.lower()
    if "timeout" in name:
        return "provider_timeout"
    if "provider" in name or name in {"connectionerror", "httperror"}:
        return "provider_unavailable"
    return "generation_failed"
