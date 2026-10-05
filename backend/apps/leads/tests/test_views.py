from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.leads.models import Contact, Lead, Newsletter

pytestmark = pytest.mark.django_db


_VALID_PAYLOAD = {
    "name": "نرگس محمدی",
    "email": "narges@example.com",
    "phone": "09120000000",
    "project_type": "website",
    "budget_range": "50_150m",
    "timeline": "within_1_month",
    "message": "سلام، می‌خواهم یک وب‌سایت بسازم.",
    "consent_given": True,
}


class TestContactCreateView:
    def test_valid_submission_creates_contact_and_lead(self) -> None:
        client = APIClient()
        with patch("apps.leads.views.notify_new_contact") as mock_notify:
            response = client.post("/api/v1/leads/contact/", _VALID_PAYLOAD, format="json")

        assert response.status_code == 201
        assert response["Cache-Control"] == "no-store"
        assert Contact.objects.filter(email="narges@example.com").exists()
        assert Lead.objects.filter(contact__email="narges@example.com").exists()
        mock_notify.assert_called_once()

    def test_without_consent_is_rejected(self) -> None:
        payload = {**_VALID_PAYLOAD, "consent_given": False}
        client = APIClient()
        response = client.post("/api/v1/leads/contact/", payload, format="json")
        assert response.status_code == 400
        assert not Contact.objects.filter(email=payload["email"]).exists()

    def test_missing_required_field_is_rejected(self) -> None:
        payload = {**_VALID_PAYLOAD}
        del payload["message"]
        client = APIClient()
        response = client.post("/api/v1/leads/contact/", payload, format="json")
        assert response.status_code == 400

    def test_ip_address_and_user_agent_are_captured_from_request(self) -> None:
        client = APIClient()
        with patch("apps.leads.views.notify_new_contact"):
            client.post(
                "/api/v1/leads/contact/",
                _VALID_PAYLOAD,
                format="json",
                HTTP_USER_AGENT="pytest-agent/1.0",
            )
        contact = Contact.objects.get(email=_VALID_PAYLOAD["email"])
        assert contact.user_agent == "pytest-agent/1.0"
        assert contact.ip_address is not None

    def test_is_public_endpoint(self) -> None:
        client = APIClient()
        with patch("apps.leads.views.notify_new_contact"):
            response = client.post("/api/v1/leads/contact/", _VALID_PAYLOAD, format="json")
        assert response.status_code != 401
        assert response.status_code != 403

    def test_response_does_not_leak_internal_fields(self) -> None:
        client = APIClient()
        with patch("apps.leads.views.notify_new_contact"):
            response = client.post("/api/v1/leads/contact/", _VALID_PAYLOAD, format="json")
        assert set(response.data.keys()) == {"public_id", "name", "created_at"}


class TestNewsletterSubscribeView:
    def test_subscribes_new_email(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/leads/newsletter/", {"email": "new-sub@example.com"}, format="json")
        assert response.status_code == 201
        assert response["Cache-Control"] == "no-store"
        assert Newsletter.objects.filter(email="new-sub@example.com").exists()

    def test_resubscribing_same_email_updates_instead_of_duplicating(self) -> None:
        client = APIClient()
        client.post(
            "/api/v1/leads/newsletter/",
            {"email": "repeat@example.com", "locale_preference": "fa"},
            format="json",
        )
        client.post(
            "/api/v1/leads/newsletter/",
            {"email": "repeat@example.com", "locale_preference": "en"},
            format="json",
        )

        assert Newsletter.objects.filter(email="repeat@example.com").count() == 1
        assert Newsletter.objects.get(email="repeat@example.com").locale_preference == "en"

    def test_invalid_email_is_rejected(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/leads/newsletter/", {"email": "not-an-email"}, format="json")
        assert response.status_code == 400


def test_anonymous_contact_and_newsletter_posts_require_csrf() -> None:
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    csrf_token = client.cookies["csrftoken"].value

    rejected_contact = client.post("/api/v1/leads/contact/", _VALID_PAYLOAD, format="json")
    rejected_newsletter = client.post(
        "/api/v1/leads/newsletter/", {"email": "csrf@example.com"}, format="json"
    )
    assert rejected_contact.status_code == 403
    assert rejected_newsletter.status_code == 403
    assert not Contact.objects.filter(email=_VALID_PAYLOAD["email"]).exists()
    assert not Newsletter.objects.filter(email="csrf@example.com").exists()

    with patch("apps.leads.views.notify_new_contact"):
        accepted_contact = client.post(
            "/api/v1/leads/contact/",
            _VALID_PAYLOAD,
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
    accepted_newsletter = client.post(
        "/api/v1/leads/newsletter/",
        {"email": "csrf@example.com"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert accepted_contact.status_code == 201
    assert accepted_newsletter.status_code == 201
