import pytest
from rest_framework.test import APIClient
from .models import ContactLead, EmailOutbox, NewsletterSubscriber, WaitlistSignup

pytestmark = pytest.mark.django_db


def test_contact_stores_lead_and_outbox_atomically():
    response = APIClient().post(
        "/api/v1/leads/contact/",
        {"name": "Test", "email": "a@example.com", "message": "سلام", "website": ""},
        format="json",
    )
    assert response.status_code == 201
    assert ContactLead.objects.count() == 1 and EmailOutbox.objects.count() == 1


def test_honeypot_returns_success_without_persisting():
    response = APIClient().post(
        "/api/v1/leads/contact/",
        {
            "name": "Bot",
            "email": "bot@example.com",
            "message": "spam",
            "website": "filled",
        },
        format="json",
    )
    assert response.status_code == 202 and ContactLead.objects.count() == 0


def test_invalid_email_rejected():
    response = APIClient().post(
        "/api/v1/leads/contact/",
        {"name": "Test", "email": "bad", "message": "x"},
        format="json",
    )
    assert response.status_code == 400


def test_newsletter_is_idempotent_and_honeypot_is_silent():
    client = APIClient()
    body = {"email": "news@example.com", "locale": "fa", "website": ""}
    assert (
        client.post("/api/v1/leads/newsletter/", body, format="json").status_code == 202
    )
    assert (
        client.post("/api/v1/leads/newsletter/", body, format="json").status_code == 202
    )
    assert (
        NewsletterSubscriber.objects.count() == 1 and EmailOutbox.objects.count() == 1
    )
    body["website"] = "bot"
    assert (
        client.post("/api/v1/leads/newsletter/", body, format="json").status_code == 202
    )
    assert NewsletterSubscriber.objects.count() == 1


def test_job_application_is_stored_with_outbox_and_honeypot_suppresses():
    client = APIClient()
    body = {
        "name": "Candidate",
        "email": "person@example.com",
        "role": "Engineer",
        "cover_letter": "",
        "website": "",
    }
    response = client.post("/api/v1/leads/job-application/", body, format="json")
    assert response.status_code == 201
    assert EmailOutbox.objects.filter(recipient="person@example.com").exists()
    body["email"] = "bot@example.com"
    body["website"] = "filled"
    assert (
        client.post("/api/v1/leads/job-application/", body, format="json").status_code
        == 202
    )
    assert ContactLead.objects.count() == 0


def test_newsletter_token_confirms_and_unsubscribes():
    client = APIClient()
    client.post(
        "/api/v1/leads/newsletter/",
        {"email": "reader@example.com", "website": ""},
        format="json",
    )
    subscriber = NewsletterSubscriber.objects.get(email="reader@example.com")
    token = subscriber.confirmation_token
    assert token
    confirmed = client.get(f"/api/v1/leads/newsletter/confirm/?token={token}")
    subscriber.refresh_from_db()
    assert confirmed.status_code == 200 and subscriber.active
    unsubscribed = client.post(
        "/api/v1/leads/newsletter/unsubscribe/", {"token": token}, format="json"
    )
    subscriber.refresh_from_db()
    assert (
        unsubscribed.status_code == 200
        and not subscriber.active
        and not subscriber.confirmation_token
    )


def test_waitlist_has_length_limited_validated_input():
    client = APIClient()
    bad = client.post(
        "/api/v1/leads/waitlist/",
        {"product": "x", "email": "no", "use_case": ""},
        format="json",
    )
    assert bad.status_code == 400
    good = client.post(
        "/api/v1/leads/waitlist/",
        {
            "product": "beta",
            "email": "a@example.com",
            "use_case": "test",
            "website": "",
        },
        format="json",
    )
    assert good.status_code == 202 and WaitlistSignup.objects.count() == 1
