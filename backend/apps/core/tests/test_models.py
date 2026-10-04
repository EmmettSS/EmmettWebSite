from __future__ import annotations

from typing import cast

import pytest

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import AuditLog, log_action

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
