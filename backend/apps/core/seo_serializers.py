"""Serializerهای payloadهای SEO (فاز ۷ — ADR-0031).

وجود این serializerها فقط برای «تیپ‌بودن + تولید OpenAPI خودکار» است
(قانون ۷ و ۸)؛ داده از ``apps.core.seo`` می‌آید که خودش تجمیع/کش را انجام
می‌دهد. هیچ serializer نوشتنی ندارد چون این endpointها فقط‌خواندنی هستند.
"""

from __future__ import annotations

from rest_framework import serializers


class LocaleSerializer(serializers.Serializer[dict[str, object]]):
    code = serializers.CharField()
    # ``Field.label`` در stubs جنگو/DRF نوع ``str | _StrPromise | None`` دارد؛
    # تعریف فیلدی هم‌نام با آن، تعارض تایپی می‌سازد. با ``source="label"`` کلید
    # خروجی/OpenAPI همان ``label`` می‌ماند و تعارض فقط در نام پایتونی رفع شده.
    locale_label = serializers.CharField(source="label")


class OrganizationSerializer(serializers.Serializer[dict[str, object]]):
    name = serializers.CharField()
    legal_name = serializers.CharField(allow_blank=True)
    url = serializers.CharField()
    email = serializers.CharField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    same_as = serializers.ListField(child=serializers.CharField())
    logo_url = serializers.CharField()


class SEOSettingsSerializer(serializers.Serializer[dict[str, object]]):
    site_name = serializers.CharField()
    default_locale = serializers.CharField()
    public_site_url = serializers.CharField()
    locales = LocaleSerializer(many=True)
    default_meta_title = serializers.CharField(allow_blank=True)
    default_meta_description = serializers.CharField(allow_blank=True)
    search_console_verification = serializers.CharField(allow_blank=True)
    twitter_handle = serializers.CharField(allow_blank=True)
    organization = OrganizationSerializer()
    default_og_image = serializers.CharField(allow_null=True)
    noindex_paths = serializers.ListField(child=serializers.CharField())
    sitemap_sections = serializers.ListField(child=serializers.CharField())
    generated_at = serializers.DateTimeField()
    two_factor_required = serializers.BooleanField()
    search_console_help = serializers.CharField()


class SitemapEntrySerializer(serializers.Serializer[dict[str, str]]):
    section = serializers.ChoiceField(choices=("pages", "services", "projects", "blog", "academy"))
    path = serializers.CharField()
    lastmod = serializers.DateTimeField()
    changefreq = serializers.ChoiceField(
        choices=("always", "hourly", "daily", "weekly", "monthly", "yearly", "never")
    )
    priority = serializers.DecimalField(max_digits=2, decimal_places=1)


class RedirectEntrySerializer(serializers.Serializer[dict[str, object]]):
    from_path = serializers.CharField()
    target = serializers.CharField(allow_blank=True)
    status_code = serializers.IntegerField()
    updated_at = serializers.DateTimeField()


class FAQItemSerializer(serializers.Serializer[dict[str, object]]):
    id = serializers.IntegerField()
    question = serializers.CharField()
    answer = serializers.CharField()


__all__ = [
    "FAQItemSerializer",
    "LocaleSerializer",
    "OrganizationSerializer",
    "RedirectEntrySerializer",
    "SEOSettingsSerializer",
    "SitemapEntrySerializer",
]
