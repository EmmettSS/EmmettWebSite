"""ادمین اپ ``taxonomy`` — دسته‌بندی‌ها و برچسب‌ها (فاز ۶)."""

from __future__ import annotations

from django.contrib import admin

from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)
from apps.taxonomy.models import Category, Tag
from apps.taxonomy.resources import CategoryResource, TagResource


@admin.register(Category)
class CategoryAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = CategoryResource
    list_display = ("name", "scope", "parent", "slug", "is_active")
    list_display_links = ("name",)
    list_filter = ("scope", "is_active", "parent", RecordStateFilter)
    search_fields = ("name_fa", "name_en", "slug")
    autocomplete_fields = ("parent",)
    list_select_related = ("parent",)
    ordering = ("scope", "name_fa")


@admin.register(Tag)
class TagAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = TagResource
    list_display = ("name", "slug", "is_active")
    list_display_links = ("name",)
    list_filter = ("is_active", RecordStateFilter)
    search_fields = ("name_fa", "name_en", "slug")
    ordering = ("name_fa",)


__all__ = ["CategoryAdmin", "TagAdmin"]
