from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.taxonomy.models import Category, Tag


@register(Category)
class CategoryTranslationOptions(TranslationOptions):
    fields = ("name",)


@register(Tag)
class TagTranslationOptions(TranslationOptions):
    fields = ("name",)
