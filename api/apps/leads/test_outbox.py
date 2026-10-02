import pytest
from django.core.management import call_command
from unittest.mock import patch
from .models import EmailOutbox

pytestmark = pytest.mark.django_db


def test_outbox_success_marks_message_sent():
    item = EmailOutbox.objects.create(
        recipient="x@example.com", subject="Hi", body="Body"
    )
    with patch("apps.leads.management.commands.send_outbox.send_mail", return_value=1):
        call_command("send_outbox", limit=10, verbosity=0)
    item.refresh_from_db()
    assert item.state == "sent" and item.attempts == 1


def test_outbox_recovers_stale_sending_lock():
    from datetime import timedelta
    from django.utils import timezone

    item = EmailOutbox.objects.create(
        recipient="x@example.com",
        subject="Hi",
        body="Body",
        state="sending",
        locked_at=timezone.now() - timedelta(hours=1),
    )
    with patch("apps.leads.management.commands.send_outbox.send_mail", return_value=1):
        call_command("send_outbox", limit=10, verbosity=0)
    item.refresh_from_db()
    assert item.state == "sent" and item.locked_at is None


def test_outbox_smtp_failure_is_retryable():
    item = EmailOutbox.objects.create(
        recipient="x@example.com", subject="Hi", body="Body"
    )
    with patch(
        "apps.leads.management.commands.send_outbox.send_mail",
        side_effect=OSError("offline"),
    ):
        call_command("send_outbox", limit=10, verbosity=0)
    item.refresh_from_db()
    assert item.state == "pending" and item.attempts == 1
    assert "offline" in item.last_error and item.next_attempt_at is not None
