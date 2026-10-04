from __future__ import annotations

from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.company.models import TeamMember, Testimonial


@admin.register(TeamMember)
class TeamMemberAdmin(TranslationAdmin[TeamMember]):
    list_display = ("full_name", "role_title", "order", "is_active")
    search_fields = ("full_name", "role_title")
    ordering = ("order",)


@admin.register(Testimonial)
class TestimonialAdmin(TranslationAdmin[Testimonial]):
    list_display = ("author_name", "author_company", "is_featured", "order")
    list_filter = ("is_featured",)
    search_fields = ("author_name", "author_company", "quote")
    autocomplete_fields = ("related_project",)
