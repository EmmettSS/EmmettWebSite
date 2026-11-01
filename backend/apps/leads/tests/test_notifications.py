from __future__ import annotations

from typing import cast
from unittest.mock import MagicMock, patch

import pytest

from apps.leads.models import Contact
from apps.leads.notifications import (
    ConsoleSMSBackend,
    FakeSMSBackend,
    KavenegarSMSBackend,
    get_sms_backend,
    notify_new_contact,
)
from apps.leads.tests.factories import ContactFactory

pytestmark = pytest.mark.django_db


class TestKavenegarSMSBackend:
    def test_send_success_calls_kavenegar_api(self) -> None:
        backend = KavenegarSMSBackend(api_key="test-key", sender="1000")
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None

        with patch("apps.leads.notifications.requests.post", return_value=mock_response) as mock_post:
            result = backend.send(to="09120000000", message="سلام")

        assert result.success is True
        assert result.provider == "kavenegar"
        called_url = mock_post.call_args.args[0]
        assert "test-key" in called_url
        assert mock_post.call_args.kwargs["data"]["receptor"] == "09120000000"
        assert mock_post.call_args.kwargs["data"]["sender"] == "1000"

    def test_send_failure_returns_unsuccessful_result(self) -> None:
        import requests

        backend = KavenegarSMSBackend(api_key="test-key")
        with (
            patch(
                "apps.leads.notifications.requests.post",
                side_effect=requests.RequestException("request failed for /v1/test-key/sms/send.json"),
            ),
            patch("apps.leads.notifications.logger.warning") as mock_warning,
        ):
            result = backend.send(to="09120000000", message="سلام")

        assert result.success is False
        assert result.provider == "kavenegar"
        assert result.detail == "RequestException"
        assert mock_warning.call_args.kwargs["error_type"] == "RequestException"
        assert "test-key" not in str(mock_warning.call_args)


class TestConsoleSMSBackend:
    def test_send_always_succeeds_without_network_call(self) -> None:
        backend = ConsoleSMSBackend()
        with patch("apps.leads.notifications.logger.info") as mock_info:
            result = backend.send(to="09120000000", message="اطلاعات تماس محرمانه")

        assert result.success is True
        assert result.provider == "console"
        assert mock_info.call_args.args == ("sms_would_send",)
        assert mock_info.call_args.kwargs == {"provider": "console"}


class TestFakeSMSBackend:
    def test_records_sent_messages(self) -> None:
        backend = FakeSMSBackend()
        backend.send(to="09120000000", message="پیام اول")
        backend.send(to="09121111111", message="پیام دوم")
        assert backend.sent_messages == [
            ("09120000000", "پیام اول"),
            ("09121111111", "پیام دوم"),
        ]


class TestGetSmsBackend:
    def test_returns_console_backend_when_no_api_key_configured(self, settings: object) -> None:
        import django.conf

        cast(django.conf.LazySettings, settings).KAVENEGAR_API_KEY = ""
        backend = get_sms_backend()
        assert isinstance(backend, ConsoleSMSBackend)

    def test_returns_kavenegar_backend_when_api_key_configured(self, settings: object) -> None:
        import django.conf

        cast(django.conf.LazySettings, settings).KAVENEGAR_API_KEY = "a-real-key"
        backend = get_sms_backend()
        assert isinstance(backend, KavenegarSMSBackend)


class TestNotifyNewContact:
    def test_does_nothing_when_no_notification_channels_configured(self, settings: object) -> None:
        import django.conf

        s = cast(django.conf.LazySettings, settings)
        s.LEADS_NOTIFICATION_PHONE = ""
        s.LEADS_NOTIFICATION_EMAIL = ""
        contact = cast(Contact, ContactFactory())

        with (
            patch("apps.leads.notifications.get_sms_backend") as mock_get_backend,
            patch("apps.leads.notifications.send_mail") as mock_send_mail,
        ):
            notify_new_contact(contact)

        mock_get_backend.assert_not_called()
        mock_send_mail.assert_not_called()

    def test_sends_sms_when_phone_configured(self, settings: object) -> None:
        import django.conf

        s = cast(django.conf.LazySettings, settings)
        s.LEADS_NOTIFICATION_PHONE = "09120000000"
        s.LEADS_NOTIFICATION_EMAIL = ""
        contact = cast(Contact, ContactFactory(name="مشتری تست"))

        fake_backend = FakeSMSBackend()
        with patch("apps.leads.notifications.get_sms_backend", return_value=fake_backend):
            notify_new_contact(contact)

        assert len(fake_backend.sent_messages) == 1
        to, message = fake_backend.sent_messages[0]
        assert to == "09120000000"
        assert "مشتری تست" in message

    def test_sends_email_when_email_configured(self, settings: object) -> None:
        import django.conf

        s = cast(django.conf.LazySettings, settings)
        s.LEADS_NOTIFICATION_PHONE = ""
        s.LEADS_NOTIFICATION_EMAIL = "team@example.com"
        contact = cast(Contact, ContactFactory(name="مشتری ایمیلی"))

        with patch("apps.leads.notifications.send_mail") as mock_send_mail:
            notify_new_contact(contact)

        mock_send_mail.assert_called_once()
        assert mock_send_mail.call_args.kwargs["recipient_list"] == ["team@example.com"]

    def test_sms_failure_does_not_raise(self, settings: object) -> None:
        import django.conf

        s = cast(django.conf.LazySettings, settings)
        s.LEADS_NOTIFICATION_PHONE = "09120000000"
        s.LEADS_NOTIFICATION_EMAIL = ""
        contact = cast(Contact, ContactFactory())

        with patch("apps.leads.notifications.get_sms_backend", side_effect=Exception("boom")):
            notify_new_contact(contact)  # should not raise

    def test_email_transport_failure_is_logged_without_failing_notification(self, settings: object) -> None:
        import django.conf

        s = cast(django.conf.LazySettings, settings)
        s.LEADS_NOTIFICATION_PHONE = ""
        s.LEADS_NOTIFICATION_EMAIL = "team@example.com"
        contact = cast(Contact, ContactFactory())

        with (
            patch("apps.leads.notifications.send_mail", side_effect=OSError("SMTP unavailable")) as send_mail,
            patch("apps.leads.notifications.logger.exception") as mock_exception,
        ):
            notify_new_contact(contact)

        assert send_mail.call_args.kwargs["fail_silently"] is False
        mock_exception.assert_called_once_with("contact_email_notification_failed", contact_id=contact.pk)
