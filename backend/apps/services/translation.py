from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.services.models import Service


@register(Service)
class ServiceTranslationOptions(TranslationOptions):
    fields = ("title", "summary", "description", "description_html", "meta_title", "meta_description")
