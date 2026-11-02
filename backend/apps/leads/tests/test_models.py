from __future__ import annotations

from typing import cast

import pytest

from apps.leads.models import Contact, Lead, Newsletter
from apps.leads.tests.factories import ContactFactory

pytestmark = pytest.mark.django_db


class TestContactModel:
    def test_str_includes_name_and_email(self) -> None:
        contact = cast(Contact, ContactFactory(name="علی رضایی", email="ali@example.com"))
        assert str(contact) == "علی رضایی <ali@example.com>"


class TestLeadModel:
    def test_str_includes_pk_and_status(self) -> None:
        contact = cast(Contact, ContactFactory())
        lead = Lead.objects.create(contact=contact)
        assert str(lead) == f"Lead #{lead.pk} (new)"

    def test_default_status_is_new(self) -> None:
        lead = Lead.objects.create()
        assert lead.status == Lead.Status.NEW

    def test_default_ordering_by_priority_then_created_at(self) -> None:
        Lead.objects.create(priority_score=1)
        high_priority = Lead.objects.create(priority_score=10)
        leads = list(Lead.objects.all())
        assert leads[0] == high_priority


class TestNewsletterModel:
    def test_str_returns_email(self) -> None:
        newsletter = Newsletter.objects.create(email="subscriber@example.com")
        assert str(newsletter) == "subscriber@example.com"

    def test_confirmation_token_is_auto_generated_and_unique(self) -> None:
        a = Newsletter.objects.create(email="a@example.com")
        b = Newsletter.objects.create(email="b@example.com")
        assert a.confirmation_token != b.confirmation_token
        assert len(a.confirmation_token) > 20

    def test_is_confirmed_defaults_to_false(self) -> None:
        newsletter = Newsletter.objects.create(email="unconfirmed@example.com")
        assert newsletter.is_confirmed is False

    def test_email_must_be_unique(self) -> None:
        from django.db import IntegrityError

        Newsletter.objects.create(email="dup@example.com")
        with pytest.raises(IntegrityError):
            Newsletter.objects.create(email="dup@example.com")
