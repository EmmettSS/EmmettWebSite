from __future__ import annotations

from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.services.models import Service


@admin.register(Service)
class ServiceAdmin(TranslationAdmin[Service]):
    list_display = ("title", "status", "is_featured", "order", "published_at")
    list_filter = ("status", "is_featured", "categories")
    search_fields = ("title", "summary", "slug")
    filter_horizontal = ("categories", "tags")
    readonly_fields = ("description_html",)
