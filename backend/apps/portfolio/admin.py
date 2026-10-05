"""ادمین اپ ``portfolio`` — پروژه‌ها، مطالعهٔ موردی (فاز ۶)."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from modeltranslation.admin import TranslationStackedInline

from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    PublishWorkflowMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)
from apps.portfolio.models import CaseStudy, Project
from apps.portfolio.resources import CaseStudyResource, ProjectResource


class CaseStudyInline(TranslationStackedInline[CaseStudy, Project]):
    model = CaseStudy
    extra = 0
    max_num = 1
    readonly_fields = (
        "challenge_html",
        "approach_html",
        "architecture_notes_html",
        "implementation_notes_html",
        "result_html",
    )


@admin.register(Project)
class ProjectAdmin(PublishWorkflowMixin, SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = ProjectResource
    list_display = (
        "title",
        "status_badge",
        "is_product",
        "year",
        "is_featured",
        "order",
        "published_at",
    )
    list_display_links = ("title",)
    list_editable = ("is_product", "is_featured", "order")
    list_filter = (
        "status",
        "is_product",
        "is_featured",
        "year",
        "categories",
        "created_at",
        RecordStateFilter,
    )
    search_fields = ("title_fa", "title_en", "summary_fa", "summary_en", "slug", "client_name")
    autocomplete_fields = ("categories", "tags", "service", "cover_image", "og_image")
    readonly_fields = ("public_id", "created_at", "updated_at", "deleted_at")
    date_hierarchy = "created_at"
    list_select_related = ("service",)
    inlines = [CaseStudyInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "summary", "client_name", "service")}),
        (_("Media"), {"fields": ("cover_image", "gallery")}),
        (
            _("Categories and ordering"),
            {"fields": ("categories", "tags", "year", "is_product", "is_featured", "order")},
        ),
        (_("Publication"), {"fields": ("status", "published_at")}),
        (_("SEO"), {"fields": ("meta_title", "meta_description", "og_image", "canonical_path")}),
        (
            _("Technical details"),
            {"classes": ("collapse",), "fields": ("public_id", "created_at", "updated_at", "deleted_at")},
        ),
    )


@admin.register(CaseStudy)
class CaseStudyAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    """ادمین مستقل مطالعهٔ موردی (برای جست‌وجو/صادرات مستقیم؛ ویرایش اصلی در اینلاین پروژه)."""

    resource_class = CaseStudyResource
    list_display = ("project", "is_deleted", "updated_at")
    list_filter = (RecordStateFilter,)
    search_fields = ("project__title_fa", "project__title_en", "challenge_fa", "challenge_en")
    autocomplete_fields = ("project",)
    list_select_related = ("project",)
    readonly_fields = (
        "challenge_html",
        "approach_html",
        "architecture_notes_html",
        "implementation_notes_html",
        "result_html",
    )
