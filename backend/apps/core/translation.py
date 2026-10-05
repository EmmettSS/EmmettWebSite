"""ثبت فیلدهای i18n مدل‌های core نزد django-modeltranslation (ADR-0003).

فاز ۷: فیلدهای SEO سایت (عنوان/توضیح پیش‌فرض متا و اطلاعات سازمان) و پرسش‌های
متداول هم دوزبانه‌اند تا JSON-LD و متاتگ‌ها به زبان همان صفحه ساخته شوند
(ADR-0031).
"""

from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.core.models import FAQItem, Media, SiteSettings


@register(Media)
class MediaTranslationOptions(TranslationOptions):
    fields = ("alt_text", "caption")


@register(SiteSettings)
class SiteSettingsTranslationOptions(TranslationOptions):
    fields = (
        "site_name",
        "meta_title",
        "meta_description",
        "organization_legal_name",
        "organization_address",
    )


@register(FAQItem)
class FAQItemTranslationOptions(TranslationOptions):
    fields = ("question", "answer")
