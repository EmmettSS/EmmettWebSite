"""تست‌های گردش‌کار انتشار و بازگردانی در ادمین — فاز ۶ (ADR-0028).

تصمیم محصولی (تأیید مالک): **بدون migration و بدون وضعیت ``review``**؛ فقط
اکشن‌های گروهی روی همان ``draft/published/archived`` و ثبت هر اقدام در
``AuditLog``. این تست‌ها همان قرارداد را قفل می‌کنند:

- ``published_at`` اولیه هرگز با انتشار دوباره بازنویسی نمی‌شود.
- هیچ اکشنی بدون مجوز ``change`` دیده نمی‌شود.
- هر اقدام گروهی یک ردیف ``AuditLog`` با فهرست شناسه‌ها می‌سازد.
- اکشن تکراری (روی داده‌ای که همین حالا در آن وضعیت است) پیام «کاری لازم
  نیست» می‌دهد و ردیف حسابرسی جدید نمی‌سازد (بدون نویز در لاگ).
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, cast

import pytest
from django.contrib import admin as django_admin
from django.contrib.auth.models import Permission
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.admin_mixins import RecordStateFilter
from apps.core.models import AuditLog, PublishableModel
from apps.core.tests.admin_helpers import admin_request
from apps.services.admin import ServiceAdmin
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


def _staff_with(*codens: str) -> User:
    user = cast(User, UserFactory(is_staff=True))
    user.user_permissions.add(*Permission.objects.filter(codename__in=codens))
    return User.objects.get(pk=user.pk)


def _admin() -> ServiceAdmin:
    return ServiceAdmin(Service, django_admin.site)


class TestPublishActions:
    def test_publish_sets_status_and_first_published_at(self) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(Service, ServiceFactory(status=PublishableModel.Status.DRAFT, published_at=None))
        model_admin = _admin()

        model_admin.publish_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        service.refresh_from_db()
        assert service.status == PublishableModel.Status.PUBLISHED
        assert service.published_at is not None

        entry = AuditLog.objects.get(action="services.Service.published")
        assert entry.actor == actor
        assert entry.metadata["ids"] == [service.pk]

    def test_republishing_keeps_original_published_at(self) -> None:
        actor = _staff_with("view_service", "change_service")
        original = timezone.now() - timedelta(days=30)
        service = cast(
            Service,
            ServiceFactory(status=PublishableModel.Status.ARCHIVED, published_at=original),
        )

        _admin().publish_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        service.refresh_from_db()
        assert service.status == PublishableModel.Status.PUBLISHED
        assert service.published_at == original  # تاریخ انتشار اولیه حفظ می‌شود

    def test_unpublish_returns_to_draft_and_clears_published_at(self) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(
            Service, ServiceFactory(status=PublishableModel.Status.PUBLISHED, published_at=timezone.now())
        )

        _admin().unpublish_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        service.refresh_from_db()
        assert service.status == PublishableModel.Status.DRAFT
        assert service.published_at is None
        assert AuditLog.objects.filter(action="services.Service.unpublished").exists()

    def test_archive_keeps_published_at(self) -> None:
        actor = _staff_with("view_service", "change_service")
        published = timezone.now()
        service = cast(
            Service, ServiceFactory(status=PublishableModel.Status.PUBLISHED, published_at=published)
        )

        _admin().archive_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        service.refresh_from_db()
        assert service.status == PublishableModel.Status.ARCHIVED
        assert service.published_at == published  # تاریخچهٔ انتشار باقی می‌ماند
        assert AuditLog.objects.filter(action="services.Service.archived").exists()

    def test_noop_action_writes_no_audit_row(self) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(
            Service, ServiceFactory(status=PublishableModel.Status.PUBLISHED, published_at=timezone.now())
        )

        _admin().publish_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        assert not AuditLog.objects.filter(action="services.Service.published").exists()

    def test_bulk_publish_only_touches_selected_rows(self) -> None:
        actor = _staff_with("view_service", "change_service")
        first = cast(Service, ServiceFactory(slug="bulk-1", status=PublishableModel.Status.DRAFT))
        second = cast(Service, ServiceFactory(slug="bulk-2", status=PublishableModel.Status.DRAFT))

        _admin().publish_selected(admin_request(actor), Service.objects.filter(pk=first.pk))

        first.refresh_from_db()
        second.refresh_from_db()
        assert first.status == PublishableModel.Status.PUBLISHED
        assert second.status == PublishableModel.Status.DRAFT


class TestActionPermissions:
    def test_publish_actions_require_change_permission(self) -> None:
        viewer = _staff_with("view_service")
        editor = _staff_with("view_service", "change_service")
        model_admin = _admin()

        viewer_actions = model_admin.get_actions(admin_request(viewer, method="get"))
        editor_actions = model_admin.get_actions(admin_request(editor, method="get"))

        assert "publish_selected" not in viewer_actions
        assert "restore_selected" not in viewer_actions
        assert {"publish_selected", "unpublish_selected", "archive_selected"} <= set(editor_actions)
        assert "restore_selected" in editor_actions

    def test_actions_are_hidden_in_popup_mode(self) -> None:
        """در پنجرهٔ modal ادمین، اکشن‌ها نباید ظاهر شوند (رفتار خود Django)."""

        editor = _staff_with("view_service", "change_service")
        request = admin_request(editor, "/admin/services/service/?_popup=1", method="get")

        assert _admin().get_actions(request) == {}

    def test_delete_selected_is_not_available_for_users(self) -> None:
        """حذف گروهی کاربران عمداً بسته است (محتوای وابسته)."""

        from apps.accounts.admin import UserAdmin

        admin_user = UserAdmin(User, django_admin.site)
        actions = admin_user.get_actions(admin_request(_staff_with(), method="get"))
        assert "delete_selected" not in actions


class TestSoftDeleteRestore:
    def test_restore_brings_back_soft_deleted_row(self) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(Service, ServiceFactory())
        service.delete()  # حذف نرم (BaseModel)
        assert Service.objects.filter(pk=service.pk).count() == 0

        model_admin = _admin()
        queryset = Service.all_objects.filter(pk=service.pk)
        model_admin.restore_selected(admin_request(actor), queryset)

        restored = Service.objects.get(pk=service.pk)
        assert restored.deleted_at is None
        assert restored.is_active is True

        entry = AuditLog.objects.get(action="services.Service.restored")
        assert entry.metadata["ids"] == [service.pk]

    def test_restore_on_active_row_is_a_noop(self) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(Service, ServiceFactory())

        _admin().restore_selected(admin_request(actor), Service.objects.filter(pk=service.pk))

        assert not AuditLog.objects.filter(action="services.Service.restored").exists()

    def test_record_state_filter_switches_to_deleted_rows(self) -> None:
        """مقادیر فیلتر به‌شکل QueryDict (لیست) پاس داده می‌شوند — مثل خود Django."""

        service = cast(Service, ServiceFactory())
        service.delete()
        admin = _admin()
        queryset = Service.all_objects.all()

        deleted_filter = RecordStateFilter(
            admin_request(_staff_with("view_service"), method="get"),
            {"record_state": ["deleted"]},
            Service,
            admin,
        )
        active_filter = RecordStateFilter(
            admin_request(_staff_with("view_service"), method="get"),
            {"record_state": ["active"]},
            Service,
            admin,
        )

        assert deleted_filter.queryset(admin_request(_staff_with("view_service")), queryset).count() == 1
        assert active_filter.queryset(admin_request(_staff_with("view_service")), queryset).count() == 0

    def test_changelist_with_deleted_filter_uses_all_objects_manager(self, client: Client) -> None:
        actor = _staff_with("view_service", "change_service")
        service = cast(Service, ServiceFactory())
        service.delete()
        client.force_login(actor)

        response = client.get(reverse("admin:services_service_changelist"), {"record_state": "deleted"})

        assert response.status_code == 200
        content = response.content.decode()
        # ردیف حذف‌شده باید در فهرست دیده شود، و برچسب «بازگردانی» هم موجود باشد.
        assert f"/admin/services/service/{service.pk}/change/" in content
        assert "restore_selected" in content


def test_status_badge_renders_colored_pill() -> None:
    service = cast(Service, ServiceFactory(status=PublishableModel.Status.PUBLISHED))
    markup: Any = _admin().status_badge(service)

    assert "emmett-pill--published" in str(markup)
    assert "منتشرشده" in str(markup)  # برچسب ترجمه‌شده (نه وضعیت خام)
