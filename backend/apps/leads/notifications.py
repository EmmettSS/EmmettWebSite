"""Adapter اعلان پیامکی/ایمیلی فرم تماس — ADR-0024.

برخلاف بقیهٔ ماژول‌ها، این فایل عمداً ``notifications.py`` نام‌گذاری شده نه
``sms.py`` چون هر دو کانال (SMS + ایمیل fallback) را پوشش می‌دهد؛ منطق
کسب‌وکار (نه view/serializer) طبق قاعدهٔ مرزبندی اپ در ``ARCHITECTURE.md``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import requests
from django.conf import settings
from django.core.mail import send_mail

from apps.core.logging import get_logger
from apps.leads.models import Contact

logger = get_logger(__name__)


@dataclass(frozen=True)
class SMSResult:
    success: bool
    provider: str
    detail: str = ""


class SMSBackend(Protocol):
    """اینترفیس مشترک — پیاده‌سازی مصرف‌کننده (``apps.leads``) هرگز نباید بداند
    پشت صحنه Kavenegar واقعی صدا زده می‌شود یا فقط لاگ کنسول است."""

    def send(self, *, to: str, message: str) -> SMSResult: ...


class KavenegarSMSBackend:
    """پیاده‌سازی واقعی — فقط وقتی ``KAVENEGAR_API_KEY`` ست شده استفاده می‌شود."""

    _API_URL_TEMPLATE = "https://api.kavenegar.com/v1/{api_key}/sms/send.json"

    def __init__(self, api_key: str, sender: str = "") -> None:
        self._api_key = api_key
        self._sender = sender

    def send(self, *, to: str, message: str) -> SMSResult:
        url = self._API_URL_TEMPLATE.format(api_key=self._api_key)
        payload: dict[str, str] = {"receptor": to, "message": message}
        if self._sender:
            payload["sender"] = self._sender
        try:
            response = requests.post(url, data=payload, timeout=10)
            response.raise_for_status()
            return SMSResult(success=True, provider="kavenegar")
        except requests.RequestException as exc:
            logger.warning("kavenegar_sms_failed", to=to, error=str(exc))
            return SMSResult(success=False, provider="kavenegar", detail=str(exc))


class ConsoleSMSBackend:
    """پیش‌فرض dev/test — هیچ تماس شبکه‌ای واقعی برقرار نمی‌کند، فقط لاگ ساختاریافته."""

    def send(self, *, to: str, message: str) -> SMSResult:
        logger.info("sms_would_send", to=to, message=message)
        return SMSResult(success=True, provider="console")


class FakeSMSBackend:
    """برای تست واحد — پیام‌های ارسال‌شده را در حافظه نگه می‌دارد تا بتوان ``assert`` کرد."""

    def __init__(self) -> None:
        self.sent_messages: list[tuple[str, str]] = []

    def send(self, *, to: str, message: str) -> SMSResult:
        self.sent_messages.append((to, message))
        return SMSResult(success=True, provider="fake")


def get_sms_backend() -> SMSBackend:
    api_key = getattr(settings, "KAVENEGAR_API_KEY", "") or ""
    if api_key:
        return KavenegarSMSBackend(api_key=api_key, sender=getattr(settings, "KAVENEGAR_SENDER", ""))
    return ConsoleSMSBackend()


def notify_new_contact(contact: Contact) -> None:
    """بعد از ذخیرهٔ ``Contact`` صدا زده می‌شود — شکست اعلان هرگز نباید روی خودِ ثبت اثر بگذارد."""

    message = f"درخواست تماس جدید از {contact.name} ({contact.project_type.label_fa}) — {contact.email}"
    team_phone = getattr(settings, "LEADS_NOTIFICATION_PHONE", "") or ""
    if team_phone:
        try:
            get_sms_backend().send(to=team_phone, message=message)
        except Exception:  # noqa: BLE001 - اعلان هرگز نباید ثبت Contact را fail کند
            logger.exception("contact_sms_notification_failed", contact_id=contact.pk)

    team_email = getattr(settings, "LEADS_NOTIFICATION_EMAIL", "") or ""
    if team_email:
        try:
            send_mail(
                subject=f"درخواست تماس جدید — {contact.name}",
                message=f"{message}\n\nپیام:\n{contact.message}",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[team_email],
                fail_silently=True,
            )
        except Exception:  # noqa: BLE001
            logger.exception("contact_email_notification_failed", contact_id=contact.pk)


__all__ = [
    "SMSResult",
    "SMSBackend",
    "KavenegarSMSBackend",
    "ConsoleSMSBackend",
    "FakeSMSBackend",
    "get_sms_backend",
    "notify_new_contact",
]
