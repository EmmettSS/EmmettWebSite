"""ثبت فیلدهای i18n مدل‌های core نزد django-modeltranslation (ADR-0003)."""

from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.core.models import Media, SiteSettings


@register(Media)
class MediaTranslationOptions(TranslationOptions):
    fields = ("alt_text", "caption")


@register(SiteSettings)
class SiteSettingsTranslationOptions(TranslationOptions):
    fields = ("site_name",)
