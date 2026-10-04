from __future__ import annotations

from django.contrib import admin
from modeltranslation.admin import TranslationAdmin, TranslationStackedInline

from apps.portfolio.models import CaseStudy, Project


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
class ProjectAdmin(TranslationAdmin[Project]):
    list_display = ("title", "status", "is_product", "is_featured", "year", "order")
    list_filter = ("status", "is_product", "is_featured", "categories")
    search_fields = ("title", "summary", "slug", "client_name")
    filter_horizontal = ("categories", "tags", "gallery")
    autocomplete_fields = ("service",)
    inlines = [CaseStudyInline]
