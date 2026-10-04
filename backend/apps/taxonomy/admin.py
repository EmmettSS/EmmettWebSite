from __future__ import annotations

from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.taxonomy.models import Category, Tag


@admin.register(Category)
class CategoryAdmin(TranslationAdmin[Category]):
    list_display = ("name", "scope", "parent", "slug")
    list_filter = ("scope",)
    search_fields = ("name", "slug")


@admin.register(Tag)
class TagAdmin(TranslationAdmin[Tag]):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")
