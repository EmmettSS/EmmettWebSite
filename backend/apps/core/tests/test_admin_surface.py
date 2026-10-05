"""تست «سطح ادمین» — قفل‌کردن پوشش فاز ۶ روی همهٔ ادمین‌ها.

این تست به‌جای «تست همه‌چیز»، یک **قید ساختاری** می‌سازد: هر مدل `BaseModel`
باید در پنل گردش‌کار نرم‌حذف/بازیابی داشته باشد، هر مدل محتوایی صادرات
داشته باشد، واردات یا فعال است یا صریحاً خاموش، و هیچ ادمینی بدون
``search_fields`` یا با ستون نامعتبر نمانده باشد. اگر در آینده مدلی اضافه شود
و از mixinهای فاز ۶ جا بماند، این تست شکست می‌خورد.
"""

from __future__ import annotations

from typing import Any

import pytest
from django.contrib import admin as django_admin

from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    PublishWorkflowMixin,
    SoftDeleteAdminMixin,
)
from apps.core.models import BaseModel
from apps.core.tests.admin_helpers import superuser

#: مدل‌هایی که صاحب گردش‌کار انتشار (draft/published/archived) هستند.
PUBLISHABLE_MODELS = {
    "services.Service",
    "portfolio.Project",
    "blog.BlogPost",
    "academy.Course",
}

#: مدل‌های ``BaseModel`` که عمداً اکشن «بازگردانی» ندارند:
#: ``core.AuditLog`` یک لاگ حسابرسی قانونی است (ADR-0013) — حذف فقط با
#: ``hard=True`` توسط ابرکاربر، و بازیابی آن معنا ندارد.
SOFT_DELETE_EXEMPT = {"core.AuditLog"}

#: مدل‌هایی که واردات ندارند (دادهٔ ورودی کاربر، لاگ، فایل) — ADR-0029.
IMPORT_DISABLED_MODELS = {
    "admin.LogEntry",
    "academy.Enrollment",
    "accounts.Favorite",
    "accounts.User",
    "ai_engine.AIConcept",
    "ai_engine.AIRequest",
    "ai_engine.AISuggestion",
    "blog.Comment",
    "core.AuditLog",
    "core.Media",
    "core.SearchIndexEntry",
    "leads.Contact",
    "leads.Lead",
    "leads.Newsletter",
}

#: مدل‌های دارای واردات: کلید پایدار + فایل قابل‌بازگردانی.
IMPORT_ENABLED_MODELS = {
    "academy.Course",
    "academy.Instructor",
    "academy.Lesson",
    "accounts.Profile",
    "ai_engine.AIContentArtifact",
    "ai_engine.Catalog",
    "ai_engine.CatalogOption",
    "ai_engine.EstimationRule",
    "ai_engine.GuardrailRule",
    "ai_engine.PromptTemplate",
    "blog.BlogPost",
    "company.TeamMember",
    "company.Testimonial",
    "core.Translation",
    "portfolio.CaseStudy",
    "portfolio.Project",
    "services.Service",
    "taxonomy.Category",
    "taxonomy.Tag",
}

#: ادمین‌هایی که مال خود جنگو هستند یا سینگلتون‌اند (خارج از دامنهٔ فاز ۶).
EXPORT_EXEMPT = {"auth.Group", "core.SiteSettings"}
NO_SEARCH_EXEMPT = {"auth.Group", "core.SiteSettings"}


def _registry() -> dict[str, Any]:
    return {
        model._meta.label: model_admin
        for model, model_admin in django_admin.site._registry.items()
    }


def _models_using(mixin: type[Any]) -> set[str]:
    return {label for label, admin in _registry().items() if isinstance(admin, mixin)}


def _declares_record_state_filter(admin: Any) -> bool:
    """آیا ادمین، فیلتر «وضعیت رکورد» (حذف‌شده/همه) را در ``list_filter`` دارد؟"""

    for entry in getattr(admin, "list_filter", ()) or ():
        if entry == "record_state" or getattr(entry, "parameter_name", None) == "record_state":
            return True
    return False


class TestRegistrationSnapshot:
    def test_all_expected_models_are_registered(self) -> None:
        labels = set(_registry())
        expected = (
            PUBLISHABLE_MODELS
            | IMPORT_DISABLED_MODELS
            | IMPORT_ENABLED_MODELS
            | {"accounts.User", "admin.LogEntry", "auth.Group", "core.AuditLog", "core.Media",
               "core.SearchIndexEntry", "core.SiteSettings", "ai_engine.AIConcept"}
        )
        assert expected - labels == set()

    def test_publishable_models_use_the_workflow_mixin(self) -> None:
        assert PUBLISHABLE_MODELS - _models_using(PublishWorkflowMixin) == set()

    def test_every_domain_model_can_be_restored_from_the_panel(self) -> None:
        """هر مدلی که ``BaseModel`` است باید نرم‌حذف قابل‌بازگردانی داشته باشد.

        ``BaseModel.delete()`` پیش‌فرض نرم است؛ اگر ادمین ``SoftDeleteAdminMixin``
        نداشته باشد، ردیف حذف‌شده در پنل بی‌بازگشت می‌ماند. این تست دقیقاً همان
        شکاف را می‌بندد (دور اول: ``core.Media`` و پیکربندی‌های ``ai_engine``).
        """

        expected = {
            label
            for label, model in ((m._meta.label, m) for m in django_admin.site._registry)
            if issubclass(model, BaseModel)
        } - SOFT_DELETE_EXEMPT

        assert expected - _models_using(SoftDeleteAdminMixin) == set()

    def test_soft_delete_admins_expose_the_record_state_filter(self) -> None:
        missing = [
            label
            for label, admin in _registry().items()
            if isinstance(admin, SoftDeleteAdminMixin)
            and not _declares_record_state_filter(admin)
        ]
        assert missing == []

    def test_import_policy_is_explicit(self) -> None:
        disabled = _models_using(ImportDisabledMixin)
        assert IMPORT_DISABLED_MODELS == disabled

        registry = _registry()
        for label in IMPORT_ENABLED_MODELS:
            admin = registry[label]
            assert not isinstance(admin, ImportDisabledMixin), label
            assert getattr(admin, "resource_class", None) is not None, label

    def test_import_disabled_and_enabled_sets_do_not_overlap(self) -> None:
        assert IMPORT_ENABLED_MODELS & IMPORT_DISABLED_MODELS == set()


class TestAdminQualityGuards:
    def test_every_admin_has_search_fields(self) -> None:
        missing = [
            label
            for label, admin in _registry().items()
            if label not in NO_SEARCH_EXEMPT and not getattr(admin, "search_fields", ())
        ]
        assert missing == []

    def test_export_ready_admins_declare_an_explicit_resource(self) -> None:
        """هر ادمین صادرات باید ``resource_class`` صریح و از خانوادهٔ ``EmmettResource`` داشته باشد."""

        from apps.core.resources import EmmettResource

        offenders: list[str] = []
        for label, admin in _registry().items():
            if label in EXPORT_EXEMPT or not isinstance(admin, EmmettImportExportAdmin):
                continue
            resource_class = getattr(admin, "resource_class", None)
            if resource_class is None or not issubclass(resource_class, EmmettResource):
                offenders.append(label)
            elif not list(resource_class._meta.fields or []):
                offenders.append(label)
        assert offenders == []

    def test_resource_classes_are_model_resource_subclasses(self) -> None:
        from import_export import resources

        for label, admin in _registry().items():
            resource_class = getattr(admin, "resource_class", None)
            if resource_class is None:
                continue
            assert issubclass(resource_class, resources.ModelResource), label

    def test_resource_model_matches_its_admin_model(self) -> None:
        for model, admin in django_admin.site._registry.items():
            resource_class = getattr(admin, "resource_class", None)
            if resource_class is None:
                continue
            assert resource_class._meta.model is model, model._meta.label

    def test_list_display_columns_are_strings_or_callables(self) -> None:
        for label, admin in _registry().items():
            for column in getattr(admin, "list_display", ()):
                assert isinstance(column, str) or callable(column), label

    def test_every_admin_declares_a_resource_or_is_export_exempt(self) -> None:
        missing = [
            label
            for label, admin in _registry().items()
            if label not in EXPORT_EXEMPT and not isinstance(admin, EmmettImportExportAdmin)
        ]
        assert missing == []


@pytest.mark.django_db
def test_soft_deleted_media_can_be_restored_through_the_admin(client: Any) -> None:
    """سناریوی واقعی رگرسیون: حذف نرم رسانه → انتخاب فیلتر «حذف‌شده» → بازگردانی."""

    from django.core.files.base import ContentFile

    from apps.core.models import Media

    media = Media.objects.create(file=ContentFile(b"x", name="sample.txt"), media_type="document")
    media.delete()
    assert Media.objects.filter(pk=media.pk).exists() is False
    assert Media.all_objects.filter(pk=media.pk, deleted_at__isnull=False).exists()

    client.force_login(superuser())
    from django.urls import reverse

    response = client.get(reverse("admin:core_media_changelist"), {"record_state": "deleted"})
    assert response.status_code == 200

    # فرم فهرست ادمین به همان URL جاری (همراه query string) POST می‌شود؛ پس
    # ``record_state=deleted`` در درخواست باقی می‌ماند و queryset از ``all_objects``
    # ساخته می‌شود. اگر این پارامتر حذف شود، ردیف حذف‌شده در queryset نیست و
    # اکشن پیام «چیزی برای بازگردانی نیست» می‌دهد.
    response = client.post(
        f"{reverse('admin:core_media_changelist')}?record_state=deleted",
        {"action": "restore_selected", "_selected_action": [str(media.pk)]},
        follow=True,
    )
    assert response.status_code == 200
    assert Media.objects.filter(pk=media.pk, deleted_at__isnull=True).exists()
