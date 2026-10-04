from __future__ import annotations

from typing import cast

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import AuditLog, Media, log_action
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


class TestBaseModelSoftDelete:
    """AuditLog به‌عنوان نمونهٔ زندهٔ BaseModel برای تست رفتار مشترک استفاده می‌شود."""

    def test_default_manager_excludes_soft_deleted(self) -> None:
        entry = log_action(action="test.event")
        entry.delete()  # soft delete پیش‌فرض

        assert not AuditLog.objects.filter(pk=entry.pk).exists()
        assert AuditLog.all_objects.filter(pk=entry.pk).exists()

    def test_soft_deleted_record_can_be_restored(self) -> None:
        entry = log_action(action="test.event")
        entry.delete()
        entry.refresh_from_db()
        assert entry.deleted_at is not None
        assert entry.is_active is False

        entry.restore()
        entry.refresh_from_db()

        assert entry.is_active is True
        assert entry.deleted_at is None
        assert AuditLog.objects.filter(pk=entry.pk).exists()

    def test_hard_delete_removes_record_permanently(self) -> None:
        entry = log_action(action="test.event")
        pk = entry.pk
        entry.delete(hard=True)

        assert not AuditLog.all_objects.filter(pk=pk).exists()

    def test_queryset_delete_is_soft_by_default(self) -> None:
        log_action(action="bulk.event")
        log_action(action="bulk.event")

        AuditLog.objects.filter(action="bulk.event").delete()

        assert AuditLog.objects.filter(action="bulk.event").count() == 0
        assert AuditLog.all_objects.filter(action="bulk.event").count() == 2

    def test_queryset_hard_delete_removes_permanently(self) -> None:
        log_action(action="bulk.hard")
        AuditLog.objects.filter(action="bulk.hard").hard_delete()

        assert AuditLog.all_objects.filter(action="bulk.hard").count() == 0


class TestAuditLogHelper:
    def test_log_action_links_target_generic_relation(self) -> None:
        # UserFactory() در زمان اجرا نمونهٔ واقعی User برمی‌گرداند؛ cast فقط برای
        # هماهنگی با محدودیت‌های typing استاتیک factory_boy لازم است.
        actor = cast(User, UserFactory())
        target = cast(User, UserFactory())

        entry = log_action(
            action="user.role_changed",
            actor=actor,
            target=target,
            metadata={"old_role": "client", "new_role": "student"},
            ip_address="127.0.0.1",
        )

        assert entry.target == target
        assert entry.actor == actor
        assert entry.metadata["new_role"] == "student"

    def test_log_action_without_target_is_valid(self) -> None:
        entry = log_action(action="system.startup")
        assert entry.target_content_type is None
        assert entry.target_object_id is None


class TestBaseModelLifecycleAuditLog:
    """ADR-0013: حذف/بازیابی رکورد («حذف/بازیابی رکورد») باید در AuditLog ثبت شود.

    ``Service`` (نه ``AuditLog``) عمداً استفاده می‌شود تا رفتار عمومی
    ``BaseModel`` روی یک مدل دامنهٔ معمولی تست شود؛ حذف/بازیابی خودِ
    ``AuditLog`` آگاهانه از این لاگ‌گیری مستثنا شده (ر.ک. ``_log_lifecycle_event``).
    """

    def test_soft_delete_is_logged(self) -> None:
        service = cast(Service, ServiceFactory())
        actor = cast(User, UserFactory())

        service.delete(actor=actor)

        entry = AuditLog.objects.get(action="services.Service.soft_delete")
        assert entry.actor == actor
        assert entry.target == service

    def test_hard_delete_is_logged_before_row_disappears(self) -> None:
        service = cast(Service, ServiceFactory())
        pk = service.pk

        service.delete(hard=True)

        entry = AuditLog.objects.get(action="services.Service.hard_delete")
        assert entry.metadata["pk"] == pk
        assert not Service.all_objects.filter(pk=pk).exists()

    def test_restore_is_logged(self) -> None:
        service = cast(Service, ServiceFactory())
        service.delete()

        service.restore()

        assert AuditLog.objects.filter(action="services.Service.restore").exists()

    def test_deleting_an_audit_log_entry_does_not_recurse(self) -> None:
        entry = log_action(action="test.event")
        entry.delete()

        # باید دقیقاً همان یک رکورد اولیه باشد؛ هیچ AuditLog اضافه‌ای دربارهٔ
        # حذف خودِ AuditLog ساخته نشده باشد.
        assert AuditLog.all_objects.count() == 1


class TestMediaValidation:
    """ADR-0005: whitelist پسوند + بررسی سرنام + محدودیت حجم روی ``core.Media``."""

    def test_valid_png_passes_full_clean(self) -> None:
        media = Media(
            file=SimpleUploadedFile(
                "photo.png", b"\x89PNG\r\n\x1a\n" + b"rest", content_type="image/png"
            ),
            media_type=Media.MediaType.IMAGE,
        )
        media.full_clean()  # no raise

    def test_disallowed_extension_is_rejected(self) -> None:
        media = Media(
            file=SimpleUploadedFile("script.exe", b"MZ...", content_type="application/octet-stream"),
            media_type=Media.MediaType.DOCUMENT,
        )
        with pytest.raises(ValidationError):
            media.full_clean()

    def test_forged_extension_rejected_by_signature_check(self) -> None:
        media = Media(
            file=SimpleUploadedFile("fake.png", b"not-a-real-png", content_type="image/png"),
            media_type=Media.MediaType.IMAGE,
        )
        with pytest.raises(ValidationError):
            media.full_clean()

    def test_oversized_image_rejected(self, settings: object) -> None:
        import django.conf

        cast(django.conf.LazySettings, settings).MEDIA_MAX_IMAGE_SIZE_MB = 1
        media = Media(
            file=SimpleUploadedFile(
                "huge.png",
                b"\x89PNG\r\n\x1a\n" + b"x" * (2 * 1024 * 1024),
                content_type="image/png",
            ),
            media_type=Media.MediaType.IMAGE,
        )
        with pytest.raises(ValidationError):
            media.full_clean()
