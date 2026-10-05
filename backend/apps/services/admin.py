"""ادمین اپ ``services`` — گردش‌کار انتشار + صادرات/واردات (فاز ۶)."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    PublishWorkflowMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)
from apps.services.models import Service
from apps.services.resources import ServiceResource


@admin.register(Service)
class ServiceAdmin(PublishWorkflowMixin, SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = ServiceResource
    list_display = ("title", "status_badge", "is_featured", "order", "published_at", "updated_at")
    list_display_links = ("title",)
    list_editable = ("is_featured", "order")
    list_filter = ("status", "is_featured", "categories", "created_at", RecordStateFilter)
    search_fields = ("title_fa", "title_en", "summary_fa", "summary_en", "slug")
    autocomplete_fields = ("categories", "tags", "og_image")
    readonly_fields = ("description_html", "public_id", "created_at", "updated_at", "deleted_at")
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("title", "slug", "summary", "icon", "description")}),
        (_("Categories and ordering"), {"fields": ("categories", "tags", "order", "is_featured")}),
        (_("Publication"), {"fields": ("status", "published_at")}),
        (_("SEO"), {"fields": ("meta_title", "meta_description", "og_image", "canonical_path")}),
        (
            _("Technical details"),
            {
                "classes": ("collapse",),
                "fields": ("description_html", "public_id", "created_at", "updated_at", "deleted_at"),
            },
        ),
    )
