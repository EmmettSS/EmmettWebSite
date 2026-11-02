"""ادمین اپ ``company`` — اعضای تیم و نظرات مشتریان (فاز ۶)."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.company.models import TeamMember, Testimonial
from apps.company.resources import TeamMemberResource, TestimonialResource
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)


@admin.register(TeamMember)
class TeamMemberAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = TeamMemberResource
    list_display = ("full_name", "role_title", "order", "is_active", "user")
    list_display_links = ("full_name",)
    list_editable = ("order", "is_active")
    list_filter = ("is_active", RecordStateFilter)
    search_fields = ("full_name", "role_title_fa", "role_title_en", "bio_fa")
    autocomplete_fields = ("user", "photo")
    list_select_related = ("user",)
    ordering = ("order",)
    fieldsets = (
        (None, {"fields": ("full_name", "user", "role_title", "bio", "photo")}),
        (_("Ordering"), {"fields": ("order", "is_active")}),
        (_("Links"), {"fields": ("social_links",)}),
    )


@admin.register(Testimonial)
class TestimonialAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = TestimonialResource
    list_display = ("author_name", "author_company", "is_featured", "order", "related_project")
    list_display_links = ("author_name",)
    list_editable = ("is_featured", "order")
    list_filter = ("is_featured", "related_project", RecordStateFilter)
    search_fields = ("author_name", "author_company", "quote_fa", "quote_en")
    autocomplete_fields = ("related_project", "author_photo")
    list_select_related = ("related_project",)
    ordering = ("order",)
    fieldsets = (
        (None, {"fields": ("author_name", "author_role", "author_company", "author_photo")}),
        (_("Quote"), {"fields": ("quote", "related_project")}),
        (_("Ordering"), {"fields": ("is_featured", "order", "is_active")}),
    )
